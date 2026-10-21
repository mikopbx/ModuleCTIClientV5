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

const moduleCTIClientV5 = {
	$statusToggle: $('#module-status-toggle'),
	$callerIdSetupToggle: $('#setup-caller-id-toggle'),
	$callerIdTransliterationToggleBlock: $('#transliterate-caller-id-toggle-block'),
	$formObj: $('#module-cti-client-form'),
	$moduleStatus: $('#status'),
	$debugToggle: $('#debug-mode-toggle'),
	$dirrtyField: $('#dirrty'),
	$debugTab: $('#module-cti-client-tabs .item[data-tab="debug"]'),
	$regenerateTokenBtn: $('#regenerate-token-btn'),
	$authTokenField: $('input[name="authorization_token"]'),
	validateRules: {
	},
	initialize() {
		$('#module-cti-client-form .item').tab();
		if (moduleCTIClientV5.$debugToggle.checkbox('is unchecked')){
			moduleCTIClientV5.$debugTab.hide()
		}
		moduleCTIClientV5.$debugToggle
			.checkbox({
				onChecked() {
					moduleCTIClientV5.$debugTab.show()
				},
				onUnchecked() {
					moduleCTIClientV5.$debugTab.hide()
				},
			});


		moduleCTIClientV5.$callerIdSetupToggle
			.checkbox({
				onChange: moduleCTIClientV5.setCallerIdToggle
			});


		moduleCTIClientV5.initializeForm();
		moduleCTIClientV5.checkStatusToggle();
		moduleCTIClientV5.setCallerIdToggle();
		moduleCTIClientV5.initRegenerateTokenButton();
		window.addEventListener('ModuleStatusChanged', moduleCTIClientV5.checkStatusToggle);
	},
	/**
	 * Initialize regenerate token button click handler
	 */
	initRegenerateTokenButton() {
		moduleCTIClientV5.$regenerateTokenBtn.on('click', (e) => {
			e.preventDefault();
			$.api({
				url: `${Config.pbxUrl}/pbxcore/api/module-cti-client-v5/regenerateAuthorizationToken`,
				on: 'now',
				successTest(response) {
					return response.result === true;
				},
				onSuccess(response) {
					if (response.data && response.data.newToken) {
						moduleCTIClientV5.$formObj.form('set value', 'authorization_token', response.data.newToken);	
						Form.dataChanged();
					}
				},
				onFailure(response) {
					UserMessage.showError(response.message);
				},
			});
		});
	},
	/**
	 * Проверка состояния модуля
	 */
	checkStatusToggle() {
		if (moduleCTIClientV5.$statusToggle.checkbox('is checked')) {
			$('.disability').removeClass('disabled');
			moduleCTIClientV5.$moduleStatus.show();
			moduleCTIClientV5ConnectionCheckWorker.initialize();
		} else {
			moduleCTIClientV5.$moduleStatus.hide();
			moduleCTIClientV5.$moduleStatus.hide();
			$('.disability').addClass('disabled');
			$('.message.ajax').remove();
		}
	},
	/**
	 * Переключатель установки CallerID из 1С
	 * Прячет или показывает статус транслитерации
	 */
	setCallerIdToggle() {
		if (moduleCTIClientV5.$callerIdSetupToggle.checkbox('is checked')) {
			moduleCTIClientV5.$callerIdTransliterationToggleBlock.show();
		} else {
			moduleCTIClientV5.$callerIdTransliterationToggleBlock.hide();
		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = moduleCTIClientV5.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		setTimeout(() => {
			moduleCTIClientV5ConnectionCheckWorker.initialize();
		}, 5000);
	},
	initializeForm() {
		Form.$formObj = moduleCTIClientV5.$formObj;
		Form.url = `${globalRootUrl}module-c-t-i-client-v5/save`;
		Form.validateRules = moduleCTIClientV5.validateRules;
		Form.cbBeforeSendForm = moduleCTIClientV5.cbBeforeSendForm;
		Form.cbAfterSendForm = moduleCTIClientV5.cbAfterSendForm;
		Form.initialize();
	},
};

$(document).ready(() => {
	moduleCTIClientV5.initialize();
});

