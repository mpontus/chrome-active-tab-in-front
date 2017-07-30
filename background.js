const MOVE_REATTEMPT_INTERVAL = 17;
const ERROR_MESSAGE_MOVE_WHILE_DRAGGING =
  'Tabs cannot be edited right now (user may be dragging a tab).';

function getActiveTab(cb) {
  chrome.windows.getCurrent(({ id: windowId }) => {
    chrome.tabs.query({ active: true, windowId }, (([activeTab]) => {
      cb(activeTab);
    }));
  });
}

function getTabByIndex(index, cb) {
  chrome.windows.getCurrent(({ windowId }) => {
    chrome.tabs.query({ index, windowId }, (([activeTab]) => {
      cb(activeTab);
    }));
  });
}

function ensureActiveTabInFront() {
  getActiveTab((tab) => {
    if (tab.index !== 0) {
      // Moving tab after it has been activated by mouse will cause an error
      // unless the button is released. We work around this problem by
      // scheduling reattempt after catching the error.
      chrome.tabs.move(tab.id, { index: 0 }, (args) => {
        const { lastError } = chrome.runtime;

        if (
          (lastError !== undefined) &&
          (lastError && lastError.message === ERROR_MESSAGE_MOVE_WHILE_DRAGGING)
        ) {
          setTimeout(ensureActiveTabInFront, MOVE_REATTEMPT_INTERVAL);
        }
      });
    }
  })
}

chrome.tabs.onActivated.addListener(() => {
  ensureActiveTabInFront();
});

chrome.tabs.onMoved.addListener(() => {
  ensureActiveTabInFront();
});

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'bury-tab': {
      getTabByIndex(0, (currentTab) => {
        getTabByIndex(1, (nextTab) => {
          if (!nextTab) return;

          chrome.tabs.move(currentTab.id, { index: -1 });
          chrome.tabs.update(nextTab.id, { active: true });
        });
      });

      return;
    }

    default:
      return;
  }
});
