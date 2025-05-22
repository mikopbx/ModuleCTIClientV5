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
        onSuccess: function onSuccess() {
          moduleCTIClientV5ConnectionCheckWorker.changeStatus('Connected');
          moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
          window.clearTimeout(moduleCTIClientV5ConnectionCheckWorker.timeoutHandle);
        },
        onFailure: function onFailure(response) {
          if (Object.keys(response).length > 0 && response.result === false && typeof response.data !== 'undefined') {
            moduleCTIClientV5ConnectionCheckWorker.errorCounts += 1;

            if (typeof response.data !== 'undefined' && typeof response.data.statuses !== 'undefined') {
              var countHealthy = 0;
              var status1C = 'undefined';
              $.each(response.data.statuses, function (key, value) {
                if (typeof value.name !== 'undefined' && value.state === 'ok') {
                  countHealthy++;
                }

                if (typeof value.name !== 'undefined' && value.name === 'crm-1c') {
                  status1C = value.state;
                }
              });

              if (status1C !== 'ok' && countHealthy === 6) {
                if (moduleCTIClientV5ConnectionCheckWorker.$webServiceToggle.checkbox('is checked')) {
                  moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionTo1CError');
                } else {
                  moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionTo1CWait');
                }
              } else if (countHealthy < 6) {
                if (moduleCTIClientV5ConnectionCheckWorker.errorCounts < 30) {
                  moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionProgress');
                } else {
                  moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
                }
              }
            } else {
              // Unknown
              moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
            }
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
      case 'Connected':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('green').html(globalTranslate.mod_cti_Connected);
        break;

      case 'Disconnected':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('grey').html(globalTranslate.mod_cti_Disconnected);
        break;

      case 'ConnectionProgress':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('yellow').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_ConnectionProgress));
        break;

      case 'ConnectionTo1CWait':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('yellow').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_ConnectionWait));
        break;

      case 'ConnectionTo1CError':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('yellow').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_ConnectionTo1CError));
        break;

      case 'ConnectionError':
        moduleCTIClientV5ConnectionCheckWorker.$moduleStatus.addClass('red').html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.mod_cti_ConnectionError));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtY3RpLWNsaWVudC12NS1zdGF0dXMtd29ya2VyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyIiwiJGZvcm1PYmoiLCIkIiwiJHN0YXR1c1RvZ2dsZSIsIiRkZWJ1Z1RvZ2dsZSIsIiRtb2R1bGVTdGF0dXMiLCIkc3VibWl0QnV0dG9uIiwiJGRlYnVnSW5mbyIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsImNoYW5nZVN0YXR1cyIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJjaGVja2JveCIsImFwaSIsInVybCIsIkNvbmZpZyIsInBieFVybCIsIm9uIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvbkNvbXBsZXRlIiwic2V0VGltZW91dCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsInJlbW92ZSIsImRhdGEiLCJ2aXN1YWxFcnJvclN0cmluZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJyZXBsYWNlIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsImFmdGVyIiwib25TdWNjZXNzIiwib25GYWlsdXJlIiwic3RhdHVzZXMiLCJjb3VudEhlYWx0aHkiLCJzdGF0dXMxQyIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsIm5hbWUiLCJzdGF0ZSIsIiR3ZWJTZXJ2aWNlVG9nZ2xlIiwic3RhdHVzIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJtb2RfY3RpX0Nvbm5lY3RlZCIsIm1vZF9jdGlfRGlzY29ubmVjdGVkIiwibW9kX2N0aV9Db25uZWN0aW9uUHJvZ3Jlc3MiLCJtb2RfY3RpX0Nvbm5lY3Rpb25XYWl0IiwibW9kX2N0aV9Db25uZWN0aW9uVG8xQ0Vycm9yIiwibW9kX2N0aV9Db25uZWN0aW9uRXJyb3IiLCJt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QkFGdkI7QUFHQTtBQXhDRjtBQTBDQTtBQWpLNkMsQ0FBL0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgQ29uZmlnLCBQYnhBcGkgKi9cblxuLyoqXG4gKiDQotC10YHRgtC40YDQvtCy0LDQvdC40LUg0YHQvtC10LTQuNC90LXQvdC40Y8g0LzQvtC00YPQu9GPINGBIDHQoVxuICovXG5jb25zdCBtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlciA9IHtcblx0JGZvcm1PYmo6ICQoJyNtb2R1bGUtY3RpLWNsaWVudC1mb3JtJyksXG5cdCRzdGF0dXNUb2dnbGU6ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLFxuXHQkZGVidWdUb2dnbGU6ICQoJyNkZWJ1Zy1tb2RlLXRvZ2dsZScpLFxuXHQkbW9kdWxlU3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0JGRlYnVnSW5mbzogJCgnI21vZHVsZS1jdGktY2xpZW50LWZvcm0gc3BhbiNkZWJ1Zy1pbmZvJyksXG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRlcnJvckNvdW50czogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnVXBkYXRpbmcnKTtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0aWYgKG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZS1jdGktY2xpZW50LXY1L2dldE1vZHVsZVN0YXR1c2AsXG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdFx0b25Db21wbGV0ZSgpIHtcblx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci50aW1lT3V0LFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHQkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gRGVidWcgbW9kZVxuXHRcdFx0XHRcdGlmICh0eXBlb2YgKHJlc3BvbnNlLmRhdGEpICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0bGV0IHZpc3VhbEVycm9yU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZGF0YSwgbnVsbCwgMik7XG5cblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdmlzdWFsRXJyb3JTdHJpbmcgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRcdHZpc3VhbEVycm9yU3RyaW5nID0gdmlzdWFsRXJyb3JTdHJpbmcucmVwbGFjZSgvXFxuL2csICc8YnIvPicpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kZGVidWdJbmZvXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlIGFqYXhcIj5cdFx0XG5cdFx0XHRcdFx0XHRcdFx0XHQ8cHJlIHN0eWxlPSd3aGl0ZS1zcGFjZTogcHJlLXdyYXAnPiAke3Zpc3VhbEVycm9yU3RyaW5nfTwvcHJlPlx0XHRcdFx0XHRcdFx0XHRcdFx0ICBcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5gKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kZGVidWdJbmZvXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlIGFqYXhcIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+IFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdFx0PHByZSBzdHlsZT0nd2hpdGUtc3BhY2U6IHByZS13cmFwJz4ke3Zpc3VhbEVycm9yU3RyaW5nfTwvcHJlPlx0XHRcdFx0XHRcdFx0XHRcdFx0ICBcblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnQ29ubmVjdGVkJyk7XG5cdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZVxuXHRcdFx0XHRcdFx0JiYgdHlwZW9mIChyZXNwb25zZS5kYXRhKSAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIChyZXNwb25zZS5kYXRhKSAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHRcdFx0JiYgdHlwZW9mIChyZXNwb25zZS5kYXRhLnN0YXR1c2VzKSAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0XHRcdCkge1xuXHRcdFx0XHRcdFx0XHRsZXQgY291bnRIZWFsdGh5ID0gMDtcblx0XHRcdFx0XHRcdFx0bGV0IHN0YXR1czFDID0gJ3VuZGVmaW5lZCc7XG5cblx0XHRcdFx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiAodmFsdWUubmFtZSkgIT09ICd1bmRlZmluZWQnXG5cdFx0XHRcdFx0XHRcdFx0XHQmJiB2YWx1ZS5zdGF0ZSA9PT0gJ29rJyl7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb3VudEhlYWx0aHkrKztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiAodmFsdWUubmFtZSkgIT09ICd1bmRlZmluZWQnXG5cdFx0XHRcdFx0XHRcdFx0XHQmJiB2YWx1ZS5uYW1lID09PSAnY3JtLTFjJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzMUMgPSB2YWx1ZS5zdGF0ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRpZiAoc3RhdHVzMUMgIT09ICdvaycgJiYgY291bnRIZWFsdGh5ID09PSA2ICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kd2ViU2VydmljZVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3Rpb25UbzFDRXJyb3InKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuY2hhbmdlU3RhdHVzKCdDb25uZWN0aW9uVG8xQ1dhaXQnKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoY291bnRIZWFsdGh5IDwgNikge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5lcnJvckNvdW50cyA8IDMwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3Rpb25Qcm9ncmVzcycpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3Rpb25FcnJvcicpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR9IGVsc2UgeyAvLyBVbmtub3duXG5cdFx0XHRcdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnQ29ubmVjdGlvbkVycm9yJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmNoYW5nZVN0YXR1cygnQ29ubmVjdGlvbkVycm9yJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLmVycm9yQ291bnRzID0gMDtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIHN0YXR1c1xuXHQgKi9cblx0Y2hhbmdlU3RhdHVzKHN0YXR1cykge1xuXHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdC5yZW1vdmVDbGFzcygnZ3JleScpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ3llbGxvdycpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ2dyZWVuJylcblx0XHRcdC5yZW1vdmVDbGFzcygncmVkJyk7XG5cblx0XHRzd2l0Y2ggKHN0YXR1cykge1xuXHRcdFx0Y2FzZSAnQ29ubmVjdGVkJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JlZW4nKVxuXHRcdFx0XHRcdC5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2RfY3RpX0Nvbm5lY3RlZCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnRGlzY29ubmVjdGVkJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JleScpXG5cdFx0XHRcdFx0Lmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfRGlzY29ubmVjdGVkKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdDb25uZWN0aW9uUHJvZ3Jlc3MnOlxuXHRcdFx0XHRtb2R1bGVDVElDbGllbnRWNUNvbm5lY3Rpb25DaGVja1dvcmtlci4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LmFkZENsYXNzKCd5ZWxsb3cnKVxuXHRcdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfQ29ubmVjdGlvblByb2dyZXNzfWApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Nvbm5lY3Rpb25UbzFDV2FpdCc6XG5cdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ3llbGxvdycpXG5cdFx0XHRcdFx0Lmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubW9kX2N0aV9Db25uZWN0aW9uV2FpdH1gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdDb25uZWN0aW9uVG8xQ0Vycm9yJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygneWVsbG93Jylcblx0XHRcdFx0XHQuaHRtbChgPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tb2RfY3RpX0Nvbm5lY3Rpb25UbzFDRXJyb3J9YCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnQ29ubmVjdGlvbkVycm9yJzpcblx0XHRcdFx0bW9kdWxlQ1RJQ2xpZW50VjVDb25uZWN0aW9uQ2hlY2tXb3JrZXIuJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5hZGRDbGFzcygncmVkJylcblx0XHRcdFx0XHQuaHRtbChgPGkgY2xhc3M9XCJzcGlubmVyIGxvYWRpbmcgaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tb2RfY3RpX0Nvbm5lY3Rpb25FcnJvcn1gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdVcGRhdGluZyc6XG5cdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2dyZXknKVxuXHRcdFx0XHRcdC5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfVXBkYXRlU3RhdHVzfWApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdG1vZHVsZUNUSUNsaWVudFY1Q29ubmVjdGlvbkNoZWNrV29ya2VyLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ3JlZCcpXG5cdFx0XHRcdFx0Lmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZF9jdGlfQ29ubmVjdGlvbkVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9LFxufTsiXX0=