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
const moduleCTIClientV5ConnectionCheckWorker = {
	$formObj: $('#module-cti-client-form'),
	$statusToggle: $('#module-status-toggle'),
	$debugToggle: $('#debug-mode-toggle'),
	$moduleStatus: $('#status'),
	$submitButton: $('#submitbutton'),
	$debugInfo: $('#module-cti-client-form span#debug-info'),
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	initialize() {
		moduleCTIClientV5ConnectionCheckWorker.restartWorker();
	},
	restartWorker() {
		moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
		moduleCTIClientV5ConnectionCheckWorker.changeStatus('Updating');
		window.clearTimeout(moduleCTIClientV5ConnectionCheckWorker.timeoutHandle);
		moduleCTIClientV5ConnectionCheckWorker.worker();
	},
	worker() {
		if (moduleCTIClientV5ConnectionCheckWorker.$statusToggle.checkbox('is checked')) {
			$.api({
				url: `${Config.pbxUrl}/pbxcore/api/module-cti-client-v5/getModuleStatus`,
				on: 'now',
				successTest: PbxApi.successTest,
				onComplete() {
					moduleCTIClientV5ConnectionCheckWorker.timeoutHandle = window.setTimeout(
						moduleCTIClientV5ConnectionCheckWorker.worker,
						moduleCTIClientV5ConnectionCheckWorker.timeOut,
					);
				},
				onResponse(response) {
					$('.message.ajax').remove();
					// Debug mode
					if (typeof (response.data) !== 'undefined') {
						let visualErrorString = JSON.stringify(response.data, null, 2);

						if (typeof visualErrorString === 'string') {
							visualErrorString = visualErrorString.replace(/\n/g, '<br/>');

							if (Object.keys(response).length > 0 && response.result === true) {
								moduleCTIClientV5ConnectionCheckWorker.$debugInfo
									.after(`<div class="ui message ajax">		
									<pre style='white-space: pre-wrap'> ${visualErrorString}</pre>										  
								</div>`);
							} else {
								moduleCTIClientV5ConnectionCheckWorker.$debugInfo
									.after(`<div class="ui message ajax">
									<i class="spinner loading icon"></i> 						
									<pre style='white-space: pre-wrap'>${visualErrorString}</pre>										  
								</div>`);
							}
						}
					}
				},
				onSuccess() {
					moduleCTIClientV5ConnectionCheckWorker.changeStatus('Connected');
					moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
					window.clearTimeout(moduleCTIClientV5ConnectionCheckWorker.timeoutHandle);
				},
				onFailure(response) {
					if (Object.keys(response).length > 0
						&& response.result === false
						&& typeof (response.data) !== 'undefined'
					) {
						moduleCTIClientV5ConnectionCheckWorker.errorCounts += 1;
						if (typeof (response.data) !== 'undefined'
							&& typeof (response.data.statuses) !== 'undefined'
						) {
							let countHealthy = 0;
							let status1C = 'undefined';

							$.each(response.data.statuses, (key, value) => {
								if (typeof (value.name) !== 'undefined'
									&& value.state === 'ok'){
									countHealthy++;
								}
								if (typeof (value.name) !== 'undefined'
									&& value.name === 'crm-1c') {
									status1C = value.state;
								}
							});
							if (status1C !== 'ok' && countHealthy === 6 ) {
								if (moduleCTIClientV5ConnectionCheckWorker.$webServiceToggle.checkbox('is checked')) {
									moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionTo1CError');
								} else {
									moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionTo1CWait');
								}
							} else if (countHealthy < 6) {
								if (moduleCTIClientV5ConnectionCheckWorker.errorCounts < 10) {
									moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionProgress');
								} else {
									moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
								}
							}

						} else { // Unknown
							moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
						}
					} else {
						moduleCTIClientV5ConnectionCheckWorker.changeStatus('ConnectionError');
					}
				},
			});
		} else {
			moduleCTIClientV5ConnectionCheckWorker.errorCounts = 0;
		}
	},
	/**
	 * Обновление статуса модуля
	 * @param status
	 */
	changeStatus(status) {
		moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
			.removeClass('grey')
			.removeClass('yellow')
			.removeClass('green')
			.removeClass('red');

		switch (status) {
			case 'Connected':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('green')
					.html(globalTranslate.mod_cti_Connected);
				break;
			case 'Disconnected':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('grey')
					.html(globalTranslate.mod_cti_Disconnected);
				break;
			case 'ConnectionProgress':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('yellow')
					.html(`<i class="spinner loading icon"></i>${globalTranslate.mod_cti_ConnectionProgress}`);
				break;
			case 'ConnectionTo1CWait':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('yellow')
					.html(`<i class="spinner loading icon"></i>${globalTranslate.mod_cti_ConnectionWait}`);
				break;
			case 'ConnectionTo1CError':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('yellow')
					.html(`<i class="spinner loading icon"></i>${globalTranslate.mod_cti_ConnectionTo1CError}`);
				break;
			case 'ConnectionError':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('red')
					.html(`<i class="spinner loading icon"></i>${globalTranslate.mod_cti_ConnectionError}`);
				break;
			case 'Updating':
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('grey')
					.html(`<i class="spinner loading icon"></i>${globalTranslate.mod_cti_UpdateStatus}`);
				break;
			default:
				moduleCTIClientV5ConnectionCheckWorker.$moduleStatus
					.addClass('red')
					.html(globalTranslate.mod_cti_ConnectionError);
				break;
		}
	},
};