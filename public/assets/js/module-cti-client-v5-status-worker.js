"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global globalTranslate, Form, Config, PbxApi */

/**
 * Тестирование соединения модуля с 1С
 */
var moduleCTIClientV5ConnectionCheckWorker = {
  $formObj: $('#module-cti-client-form'),
  $statusToggle: $('#module-status-toggle'),
  $debugToggle: $('#debug-mode-toggle'),
  $moduleStatus: $('#status'),
  $submitButton: $('#submitbutton'),
  $debugInfo: $('#module-cti-client-form span#debug-info'),
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
  initialize: function initialize() {
    moduleCTIClientV5ConnectionCheckWorker.restartWorker();
  },
  restartWorker: function restartWorker() {
    moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
    moduleCTIClientV5ConnectionCheckWorker.changeStatus('Updating');
    window.clearTimeout(moduleCTIClientV5ConnectionCheckWorker.timeoutHandle);
    moduleCTIClientV5ConnectionCheckWorker.worker();
  },
  worker: function worker() {
    if (moduleCTIClientV5ConnectionCheckWorker.$statusToggle.checkbox('is checked')) {
      $.api({
        url: "".concat(Config.pbxUrl, "/pbxcore/api/module-cti-client-v5/getModuleStatus"),
        on: 'now',
        successTest: PbxApi.successTest,
        onComplete: function onComplete() {
          moduleCTIClientV5ConnectionCheckWorker.timeoutHandle = window.setTimeout(moduleCTIClientV5ConnectionCheckWorker.worker, moduleCTIClientV5ConnectionCheckWorker.timeOut);
        },
        onResponse: function onResponse(response) {
          $('.message.ajax').remove(); // Debug mode

          if (typeof response.data !== 'undefined') {
            var visualErrorString = JSON.stringify(response.data, null, 2);

            if (typeof visualErrorString === 'string') {
              visualErrorString = visualErrorString.replace(/\n/g, '<br/>');

              if (Object.keys(response).length > 0 && response.result === true) {
                moduleCTIClientV5ConnectionCheckWorker.$debugInfo.after("<div class=\"ui message ajax\">\t\t\n\t\t\t\t\t\t\t\t\t<pre style='white-space: pre-wrap'> ".concat(visualErrorString, "</pre>\t\t\t\t\t\t\t\t\t\t  \n\t\t\t\t\t\t\t\t</div>"));
              } else {
                moduleCTIClientV5ConnectionCheckWorker.$debugInfo.after("<div class=\"ui message ajax\">\n\t\t\t\t\t\t\t\t\t<i class=\"spinner loading icon\"></i> \t\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t<pre style='white-space: pre-wrap'>".concat(visualErrorString, "</pre>\t\t\t\t\t\t\t\t\t\t  \n\t\t\t\t\t\t\t\t</div>"));
              }
            }
          }
        },
        onSuccess: function onSuccess(response) {
          // Check if we have valid data
          if (typeof response.data !== 'undefined' && typeof response.data.statuses !== 'undefined' && typeof response.data.crm1c !== 'undefined') {
            var coreOk = false;
            var asteriskOk = false; // Check core and asterisk status

            $.each(response.data.statuses, function (key, value) {
              if (typeof value.name !== 'undefined' && typeof value.status !== 'undefined') {
                if (value.name === 'core' && value.status === 'ok') {
                  coreOk = true;
                }

                if (value.name === 'asterisk' && value.status === 'ok') {
                  asteriskOk = true;
                }
              }
            }); // Determine status based on core, asterisk and 1C

            if (coreOk && asteriskOk) {
              if (response.data.crm1c.ok === true) {
                // All systems operational
                moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectedTo1C');
                moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
              } else {
                // Core services ok, but 1C not connected
                moduleCTIClientV5ConnectionCheckWorker.changeStatus('WaitingFor1C');
                moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
              }
            } else {
              // Core or asterisk not running
              moduleCTIClientV5ConnectionCheckWorker.errorCounts += 1;

              if (moduleCTIClientV5ConnectionCheckWorker.errorCounts < 30) {
                moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionProgress');
              } else {
                moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
              }
            }
          } else {
            moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
          }

          window.clearTimeout(moduleCTIClientV5ConnectionCheckWorker.timeoutHandle);
        },
        onFailure: function onFailure(response) {
          moduleCTIClientV5ConnectionCheckWorker.errorCounts += 1;

          if (moduleCTIClientV5ConnectionCheckWorker.errorCounts < 30) {
            moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionProgress');
          } else {
            moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
          }
        }
      });
    } else {
      moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
    }
  },

  /**
   * Обновление статуса модуля
   * @param status
   */
  changeStatus: function changeStatus(status) {
    moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.removeClass('grey').removeClass('yellow').removeClass('green').removeClass('red');

    switch (status) {
      case 'ConnectedTo1C':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('green').html(globalTranslate.mod_cti_ConnectedTo1C);
        break;

      case 'WaitingFor1C':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('yellow').html(globalTranslate.mod_cti_WaitingFor1C);
        break;

      case 'Connected':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('green').html(globalTranslate.mod_cti_Connected);
        break;

      case 'Disconnected':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('grey').html(globalTranslate.mod_cti_Disconnected);
        break;

      case 'ConnectionProgress':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('yellow').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_ConnectionProgress));
        break;

      case 'ConnectionError':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('red').html(globalTranslate.mod_cti_ConnectionError);
        break;

      case 'Updating':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('grey').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_UpdateStatus));
        break;

      default:
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('red').html(globalTranslate.mod_cti_ConnectionError);
        break;
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtY3RpLWNsaWVudC12NS1zdGF0dXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyIiwiJGZvcm1PYmoiLCIkIiwiJHN0YXR1c1RvZ2dsZSIsIiRkZWJ1Z1RvZ2dsZSIsIiRtb2R1bGVTdGF0dXMiLCIkc3VibWl0QnV0dG9uIiwiJGRlYnVnSW5mbyIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsImNoYW5nZVN0YXR1cyIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJjaGVja2JveCIsImFwaSIsInVybCIsIkNvbmZpZyIsInBieFVybCIsIm9uIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvbkNvbXBsZXRlIiwic2V0VGltZW91dCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsInJlbW92ZSIsImRhdGEiLCJ2aXN1YWxFcnJvclN0cmluZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJyZXBsYWNlIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsImFmdGVyIiwib25TdWNjZXNzIiwic3RhdHVzZXMiLCJjcm0xYyIsImNvcmVPayIsImFzdGVyaXNrT2siLCJlYWNoIiwia2V5IiwidmFsdWUiLCJuYW1lIiwic3RhdHVzIiwib2siLCJvbkZhaWx1cmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1vZF9jdGlfQ29ubmVjdGVkVG8xQyIsIm1vZF9jdGlfV2FpdGluZ0ZvcjFDIiwibW9kX2N0aV9Db25uZWN0ZWQiLCJtb2RfY3RpX0Rpc2Nvbm5lY3RlZCIsIm1vZF9jdGlfQ29ubmVjdGlvblByb2dyZXNzIiwibW9kX2N0aV9Db25uZWN0aW9uRXJyb3IiLCJtb2RfY3RpX1VwZGF0ZVN0YXR1cyJdLCJtYXBw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QUNEO0FBQ0MvRCxRQUFBQSxzQ0FBc0MsQ0FBQ0ssYUFBdkMsQ0FDRWlELFFBREYsQ0FDVyxLQURYLEVBRUVDLElBRkYsQ0FFT0MsZUFBZSxDQUFDTSx1QkFGdkI7QUFHQTtBQXhDRjtBQTBDQTtBQXZLNkMsQ0FBL0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgQ29uZmlnLCBQYnhBcGkgKi9cblxuLyoqXG4gKiDQotC10YHRgtC40YDQvtCy0LDQvdC40LUg0YHQvtC10LTQuNC90LXQvdC40Y8g0LzQvtC00YPQu9GPINGBIDHQoVxuICovXG5jb25zdCBtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlciA9IHtcblx0JGZvcm1PYmo6ICQoJyNtb2R1bGUtY3RpLWNsaWVudC1mb3JtJyksXG5cdCRzdGF0dXNUb2dnbGU6ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLFxuXHQkZGVidWdUb2dnbGU6ICQoJyNkZWJ1Zy1tb2RlLXRvZ2dsZScpLFxuXHQkbW9kdWxlU3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JGRlYnVnSW5mbzogJCgnI21vZHVsZS1jdGktY2xpZW50LWZvcm0gc3BhbiNkZWJ1Zy1pbmZvJyksXG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRlcnJvckNvdW50czogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnVXBkYXRpbmcnKTtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0aWYgKG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZS1jdGktY2xpZW50LXY1L2dldE1vZHVsZVN0YXR1c2AsXG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdFx0b25Db21wbGV0ZSgpIHtcblx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci50aW1lT3V0LFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHQkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gRGVidWcgbW9kZVxuXHRcdFx0XHRcdGlmICh0eXBlb2YgKHJlc3BvbnNlLmRhdGEpICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0bGV0IHZpc3VhbEVycm9yU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZGF0YSwgbnVsbCwgMik7XG5cblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdmlzdWFsRXJyb3JTdHJpbmcgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRcdHZpc3VhbEVycm9yU3RyaW5nID0gdmlzdWFsRXJyb3JTdHJpbmcucmVwbGFjZSgvXFxuL2csICc8YnIvPicpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kZGVidWdJbmZvXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlIGFqYXhcIj5cdFx0XG5cdFx0XHRcdFx0XHRcdFx0XHQ8cHJlIHN0eWxlPSd3aGl0ZS1zcGFjZTogcHJlLXdyYXAnPiAke3Zpc3VhbEVycm9yU3RyaW5nfTwvcHJlPlx0XHRcdFx0XHRcdFx0XHRcdFx0ICBcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5gKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kZGVidWdJbmZvXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlIGFqYXhcIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+IFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdFx0PHByZSBzdHlsZT0nd2hpdGUtc3BhY2U6IHByZS13cmFwJz4ke3Zpc3VhbEVycm9yU3RyaW5nfTwvcHJlPlx0XHRcdFx0XHRcdFx0XHRcdFx0ICBcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UgaGF2ZSB2YWxpZCBkYXRhXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiAocmVzcG9uc2UuZGF0YSkgIT09ICd1bmRlZmluZWQnXG5cdFx0XHRcdFx0XHQmJiB0eXBlb2YgKHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMpICE9PSAndW5kZWZpbmVkJ1xuXHRcdFx0XHRcdFx0JiYgdHlwZW9mIChyZXNwb25zZS5kYXRhLmNybTFjKSAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdGxldCBjb3JlT2sgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGxldCBhc3Rlcmlza09rID0gZmFsc2U7XG5cblx0XHRcdFx0XHRcdC8vIENoZWNrIGNvcmUgYW5kIGFzdGVyaXNrIHN0YXR1c1xuXHRcdFx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YgKHZhbHVlLm5hbWUpICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgKHZhbHVlLnN0YXR1cykgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHZhbHVlLm5hbWUgPT09ICdjb3JlJyAmJiB2YWx1ZS5zdGF0dXMgPT09ICdvaycpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvcmVPayA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGlmICh2YWx1ZS5uYW1lID09PSAnYXN0ZXJpc2snICYmIHZhbHVlLnN0YXR1cyA9PT0gJ29rJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0YXN0ZXJpc2tPayA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0Ly8gRGV0ZXJtaW5lIHN0YXR1cyBiYXNlZCBvbiBjb3JlLCBhc3RlcmlzayBhbmQgMUNcblx0XHRcdFx0XHRcdGlmIChjb3JlT2sgJiYgYXN0ZXJpc2tPaykge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2UuZGF0YS5jcm0xYy5vayA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEFsbCBzeXN0ZW1zIG9wZXJhdGlvbmFsXG5cdFx0XHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdDb25uZWN0ZWRUbzFDJyk7XG5cdFx0XHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdC8vIENvcmUgc2VydmljZXMgb2ssIGJ1dCAxQyBub3QgY29ubmVjdGVkXG5cdFx0XHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdXYWl0aW5nRm9yMUMnKTtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdC8vIENvcmUgb3IgYXN0ZXJpc2sgbm90IHJ1bm5pbmdcblx0XHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdFx0XHRcdFx0aWYgKG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmVycm9yQ291bnRzIDwgMzApIHtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3Rpb25Qcm9ncmVzcycpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnQ29ubmVjdGlvbkVycm9yJyk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdDb25uZWN0aW9uRXJyb3InKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdFx0XHRpZiAobW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPCAzMCkge1xuXHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdDb25uZWN0aW9uUHJvZ3Jlc3MnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdDb25uZWN0aW9uRXJyb3InKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gc3RhdHVzXG5cdCAqL1xuXHRjaGFuZ2VTdGF0dXMoc3RhdHVzKSB7XG5cdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0LnJlbW92ZUNsYXNzKCdncmV5Jylcblx0XHRcdC5yZW1vdmVDbGFzcygneWVsbG93Jylcblx0XHRcdC5yZW1vdmVDbGFzcygnZ3JlZW4nKVxuXHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKTtcblxuXHRcdHN3aXRjaCAoc3RhdHVzKSB7XG5cdFx0XHRjYXNlICdDb25uZWN0ZWRUbzFDJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JlZW4nKVxuXHRcdFx0XHRcdC5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2RfY3RpX0Nvbm5lY3RlZFRvMUMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ1dhaXRpbmdGb3IxQyc6XG5cdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ3llbGxvdycpXG5cdFx0XHRcdFx0Lmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfV2FpdGluZ0ZvcjFDKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdDb25uZWN0ZWQnOlxuXHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LmFkZENsYXNzKCdncmVlbicpXG5cdFx0XHRcdFx0Lmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfQ29ubmVjdGVkKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdEaXNjb25uZWN0ZWQnOlxuXHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LmFkZENsYXNzKCdncmV5Jylcblx0XHRcdFx0XHQuaHRtbChnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9EaXNjb25uZWN0ZWQpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Nvbm5lY3Rpb25Qcm9ncmVzcyc6XG5cdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ3llbGxvdycpXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9Db25uZWN0aW9uUHJvZ3Jlc3N9YCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnQ29ubmVjdGlvbkVycm9yJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygncmVkJylcblx0XHRcdFx0XHQuaHRtbChnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9Db25uZWN0aW9uRXJyb3IpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ1VwZGF0aW5nJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JleScpXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9VcGRhdGVTdGF0dXN9YCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygncmVkJylcblx0XHRcdFx0XHQuaHRtbChnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9Db25uZWN0aW9uRXJyb3IpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH0sXG59OyJdfQ==