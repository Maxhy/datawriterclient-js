/*jshint esversion: 6 */

import DWUtils from './DWUtils';
import DWWebcam from './DWWebcam';

export default class DWTasksProtocol {

	constructor(dwClient) {

		this.dwClient = dwClient;
		this.currentProcess = {};
		this.currentTaskId = undefined;
		this.DW_RECORD_FIELD_NAME = 'DwField';

		this.DWTasksProtocolOperations = Object.getOwnPropertyNames(DWTasksProtocol.prototype);
		this.DWMajorVersion = undefined;

		this.cardFront = undefined;
		this.cardBack = undefined;
	}

	addMessageNotified(obj) {
		var param = obj.Parameters;

		var type = DWUtils.DWTypeMsg.INFO;
		switch (param[2].Value) {
			case 0:
				type = DWUtils.DWTypeMsg.ERROR;
				break;
			case 1:
				type = DWUtils.DWTypeMsg.WARNING;
				break;
			case 2:
				type = DWUtils.DWTypeMsg.INFO;
				break;
		}

		DWUtils.addMessage(type, param[3].Value);
	}

	AttachToSessionCompleted(obj) {}

	NotifyEncodingRecordMessageNotified(obj) {
		this.addMessageNotified(obj);
	}

	CurrentRecordChanged(obj) {
		$('#cardPreviewId').hide();
		$('#dwRecordFields').empty();
		$('#userValideButton').hide();

		var param = obj.Parameters;
		DWUtils.addMessage(DWUtils.DWTypeMsg.INFO, 'Current record changed: ' + param[1].Value);
	}

	GetTaskListCompleted(obj) {
		var param = obj.Parameters;

		$('#dwTaskSelectorList').empty();
		param[0].Value.forEach(function(element) {
			var state = '';
			if (element.State === 1) { // Running
				state = ' list-group-item-success';
			}

			$('#dwTaskSelectorList').append('<button type="button" class="list-group-item' + state + '" onclick="dwWebClient.TaskProtocol.startTask(' + element.Identifier + ')">' + element.Identifier + ' - ' + element.Name + '</button>');
		});

		$('#dwTaskSelectorModal').modal('show');
	}

	SetEncodingProcessConfiguration(obj) {
		this.currentProcess = obj.Parameters;
	}

	NotifyCardPreview(obj) {
		obj.Parameters.splice(1, 0, { 'Type':  'number', 'Value': 0});
		if (obj.Parameters[2].Value) {
			obj.Parameters[2].Value = btoa(DWUtils.Uint8ToString(new Uint8Array(obj.Parameters[2].Value)));
		}
		if (obj.Parameters[3].Value) {
			obj.Parameters[3].Value = btoa(DWUtils.Uint8ToString(new Uint8Array(obj.Parameters[3].Value)));
		}

		this.NotifyCardPicture(obj);
	}

	NotifyCardPicture(obj) {
		var param = obj.Parameters;

		if (param[1].Value === 0) { //Preview
			if (param[2].Value) {
				$('#cardPreviewImgId').attr('src', 'data:image/bmp;base64,' + param[2].Value);
				$('#cardPreviewImgId').show();
				$('#cardPreviewId').show();
			}
			if (param[3].Value) {
				$('#cardPreviewImgBackId').attr('src', 'data:image/bmp;base64,' + param[3].Value);
				$('#cardPreviewImgBackId').show();
				$('#cardPreviewId').show();
			}
		} else if (param[1].Value === 1) {
			this.cardFront = param[2].Value;
			this.cardBack = param[3].Value;
		} else {
			DWUtils.log('NotifyCardPicture unknown type: ' + param[1].Value);
		}
	}

	NotifyEncodingProcessStarted(obj) {}

	SetTaskRecordConfiguration(obj) {
		var param = obj.Parameters;
		var instance = this;
		param[1].Value.forEach(function(element) {
			if (element !== 2 && element !== 4) { //Encoding && Print
				DWUtils.sendJson(instance.mWSTasks, {
					Method: 'SetCurrentRecordActionStepState',
					Parameters: [{ 'Type': 'string', 'Value': instance.currentProcess[0].Value}, { 'Type': 'number', 'Value': element}, { 'Type': 'number', 'Value': 4}] //NotAvailable
				});
			}
		});
		
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'NotifyCurrentRecordClientIsReady',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}]
		});
	}

	SetCurrentRecordField(obj) {
		var param = obj.Parameters;

		var name = param[1].Value;

		var isReadOnly = param[4].Value;
		var currentValue = param[2].Value;
		var isNumber = Number.isInteger(param[2].Value);
		var min = 0;
		var max = param[3].Value;
		var displayName = param[6].Value.length === 0 ? param[1].Value : param[6].Value;
		var editor = param[5].Value;
		var src = '';
		var base64String;

		var field = document.getElementById(name + this.DW_RECORD_FIELD_NAME);
		if (field) { //we update it
			if (editor === undefined || editor === null) {
				field.value = currentValue;
			} else if (editor === 'Image') {
				if (this.mDWMajorVersion === 2) {
					base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(currentValue)));
				} else {
					base64String = currentValue;
				}
				if (base64String.length !== 0) {
					src = 'data:image/png;base64,' + base64String;
				}
				field.src = src;
			}

		} else {

			var input = '';
			
			if (editor === undefined || editor === null) {

				input = '<input type="' + (isNumber ? 'number' : 'text') + '" class="form-control" id="' + name + this.DW_RECORD_FIELD_NAME + '" value="' + currentValue + '" ';
				if (max) {
					input += ' min="' + min + '" max="' + max + '"';
				}
				if (isReadOnly) {
					input += 'readonly';
				}
				input += '>';

			} else if (editor === 'Image') {

				if (this.mDWMajorVersion === 2) {
					base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(currentValue)));
				} else {
					base64String = currentValue;
				}

				if (base64String.length !== 0) {
					src = 'data:image/png;base64,' + base64String;
				}

				input = '<div class="form-group">';
				input += '<img class="img-responsive" id="' + name + this.DW_RECORD_FIELD_NAME + '"  max="' + max + '" src="' + src + '" />';
				if (!isReadOnly) {
					input += '<input id="' + name + this.DW_RECORD_FIELD_NAME + 'FileButton" type="file" accept="image/*"/>';
					if (DWWebcam.hasUserMediaSupport()) {
						input += '<button id="' + name + this.DW_RECORD_FIELD_NAME + 'WebCamButton" type="button" class="btn btn-secondary" data-toggle="modal" data-target="#dwCameraModal">Webcam</button>';
					}
				}
				input += '</div>';

			}

			$('#dwRecordFields').append('<li class="list-group-item"> <div class="row"> <div class="col-md-4"> ' + displayName + ' </div> <div class="col-md-8"> ' + input + ' </div></div> </li>');

			if (editor === 'Image') {
				if (!isReadOnly) {
					if ($('#' + name + this.DW_RECORD_FIELD_NAME + 'WebCamButton') !== undefined) {
						$('#' + name + this.DW_RECORD_FIELD_NAME + 'WebCamButton').click(name + this.DW_RECORD_FIELD_NAME, function(event) {
							DWWebcam.initVideo(event.data);
						});
					}
					if ($('#' + name + this.DW_RECORD_FIELD_NAME + 'FileButton') !== undefined) {
						$('#' + name + this.DW_RECORD_FIELD_NAME + 'FileButton').change({instance: this, fieldId: name + this.DW_RECORD_FIELD_NAME}, function(event) {
							DWUtils.getImageFromInputFile(this, event.data.fieldId);
						});
					}
				}
			}
		}
	}

	UserInteractionAskedAsync(obj) {
		$('#userValideButton').show();
	}

	GetCurrentRecordFieldValueAsync(obj) {
		var name = obj.Parameters[1].Value;
		var field = document.getElementById(name + this.DW_RECORD_FIELD_NAME);

		var value;
		var type;
		if (field.type === 'number') {
			value = parseInt(field.value);
			type = 'number';
		} else if (field.type === 'text') {
			value = field.value;
			type = 'string';
		} else { //Image
			if (this.mDWMajorVersion === 2) {
				value = DWUtils.convertBase64ToArray(field.value);
			} else {
				value = DWUtils.removeBase64Tag(field.getAttribute('src'));
			}
			type = 'byte[]';
		}

		DWUtils.sendJson(this.mWSTasks, {
			Method: 'GetCurrentRecordFieldValueCompleted',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}, DWUtils.getParamTypeJSON(value, type)]
		});
	}

	NotifyWaitInsertion(obj) {}

	NotifyBeginRecordCreationStep(obj) {}

	NotifyWaitRemoval(obj) {}

	NotifyEndRecordCreationStep(obj) {}

	CardErrorUserInteractionAskedAsync(obj) {
		$('#dwCardErrorUserInteractionAskedModalLabel').html(obj.Parameters[1].Value);
		$('#dwCardErrorUserInteractionAskedModal').modal('show');
	}

	NotifyEncodingMessageNotified(obj) {
		this.addMessageNotified(obj);
	}

	ProcessClientCreationStepAsync(obj) {
		var type = obj.Parameters[1].Value;
		if (type === 4) {

			$('#cardPreviewImgModalId').hide();
			$('#cardPreviewImgBackModalId').hide();

			$('#dwPrintingModal').modal('show');

			$('#cardPreviewImgModalId').attr('src', $('#cardPreviewImgId').attr('src'));
			$('#cardPreviewImgBackModalId').attr('src', $('#cardPreviewImgBackId').attr('src'));

			if ($('#cardPreviewImgModalId').attr('src').length !== 0) {
				$('#cardPreviewImgModalId').show();
			}
			if ($('#cardPreviewImgBackModalId').attr('src').length !== 0) {
				$('#cardPreviewImgBackModalId').show();
			}
		}
	}


	set WebSocketTasks(eWebSocketTask) {
		this.mWSTasks = eWebSocketTask;
	}

	get WebSocketTasks() {
		return this.mWSTasks;
	}

	set DWMajorVersion(eDWMajorVersion) {
		this.mDWMajorVersion = eDWMajorVersion;
	}

	get DWMajorVersion() {
		return this.mDWMajorVersion;
	}
   
	startTask(mTaskId) {
		if (this.dwClient.dataWriterBridge !== null) {
			if (this.currentTaskId) {
				DWUtils.sendJson(this.mWSTasks, {
					Method: 'DetachTask',
					Parameters: [{ 'Type': 'number', 'Value': this.currentTaskId}]
				});

				this.currentTaskId = undefined;
			}
		}

		$('#dwTaskSelectorModal').modal('hide');
		
		if (this.dwClient.dataWriterBridge !== null) {
			DWUtils.sendJson(this.mWSTasks, {
				Method: (DWUtils.DWMServerVersion === 3 ? 'StartEncodingTask' : 'StartEncodingProcess'),
				Parameters: [{ 'Type': 'number', 'Value': mTaskId}]
			});
		} else {
			if ($.inArray('protocol', this.dwClient.options.deviceTech) !== -1) {
				var oHiddFrame = document.createElement('iframe');
				oHiddFrame.style.visibility = 'hidden';
				oHiddFrame.style.position = 'absolute';
				oHiddFrame.src = 'datawriter://' + btoa(this.dwClient.options.uri + '@' + this.dwClient.options.login + ':' + this.dwClient.options.password + '/' + mTaskId);
				document.body.appendChild(oHiddFrame);
			}
		}

		this.currentTaskId = mTaskId;
	}
	
	startToken(mToken) {
		$('#dwTaskSelectorModal').modal('hide');
		
		if (this.dwClient.dataWriterBridge !== null) {
			DWUtils.sendJson(this.mWSTasks, {
				Method: 'StartEncodingProcess',
				Parameters: [{ 'Type': 'string', 'Value': mToken}]
			});
		} else {
			if ($.inArray('protocol', this.dwClient.options.deviceTech) !== -1) {
				var oHiddFrame = document.createElement('iframe');
				oHiddFrame.style.visibility = 'hidden';
				oHiddFrame.style.position = 'absolute';
				oHiddFrame.src = 'datawriter://' + btoa(this.dwClient.options.uri + '@' + this.dwClient.options.login + ':' + this.dwClient.options.password + '/' + mToken);
				document.body.appendChild(oHiddFrame);
			}
		}
	}

	getTaskList() {
		if (this.mWSTasks !== null) {
			DWUtils.sendJson(this.mWSTasks, {
				Method: 'GetTaskListAsync'
			});
		}
	}

	UserInteractionAskedCompleted() {
		$('#dwRecordFields :input').attr('disabled', true);

		$('#userValideButton').hide();
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'UserInteractionAskedCompleted',
			Parameters: [{ 'Type': 'string', 'Value':this.currentProcess[0].Value}]
		});
	}

	CardErrorUserInteractionAskedCompleted(response) {
		var type = 0;
		switch (response) {
			case 'Retry':
				type = 1;
				break;
			case 'Cancel':
				type = 2;
				break;
			case 'Skip':
				type = 3;
				break;
		}
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'CardErrorUserInteractionAskedCompleted',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}, { 'Type': 'number', 'Value': type}]
		});
	}
	
	ProcessClientCreationStepCompleted() {
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'ProcessClientCreationStepCompleted',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}]
		});
	}
	
	CancelPrintClientCreationStep() {
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'SetCurrentRecordActionStepState',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}, { 'Type': 'number', 'Value': 4}, { 'Type': 'number', 'Value': 2}]
		});
		this.ProcessClientCreationStepCompleted();
	}

	ProcessPrintClientCreationStep() {
		$('#dwPrintingModal').modal('hide');
		$('#cardPreviewImgModalId').attr('src', '');
		$('#cardPreviewImgBackModalId').attr('src', '');

		/* jshint ignore:start */
		function closePrint() {
			document.body.removeChild(this.__container__);
		}

		function setPrint() {
			this.contentWindow.__container__ = this;
			this.contentWindow.onbeforeunload = closePrint;
			this.contentWindow.onafterprint = closePrint;
			this.contentWindow.focus(); // Required for IE
			this.contentWindow.print();
		}
		/* jshint ignore:end */

		var pages = '<html><head><title>Card Image</title></head><body>';
		var imgCSS = '';
		var isChromium = window.chrome,
			winNav = window.navigator,
			vendorName = winNav.vendor,
			isOpera = winNav.userAgent.indexOf('OPR') > -1,
			isIEedge = winNav.userAgent.indexOf('Edge') > -1,
			isIOSChrome = winNav.userAgent.match('CriOS');

		if (isChromium !== null && isChromium !== undefined && vendorName === 'Google Inc.' && isOpera === false && isIEedge === false) {
			pages += '<div style="position: absolute;  left: 0;  top: 0;  bottom: 0;  right: 0; margin: 0; padding: 0; display: block;">';
			imgCSS = 'width: 100%; height: 100%; margin: 0; padding: 0; display: block;';
		} else {
			pages += '<div style="position: absolute;  left: 0;  top: 0;  bottom: 0;  right: 0;">';
			imgCSS = 'width: 100%; height: 100%;';
		}

		pages += '<img style="' + imgCSS + '" src="data:image/bmp;base64,' + this.cardFront + '">';
		if (this.cardBack !== undefined && this.cardBack !== null) {
			pages += '<img style="' + imgCSS + '" src="data:image/bmp;base64,' + this.cardBack + '">';
		}
		pages += '</div></body></html>';

		var oHiddFrame = document.createElement('iframe');
		/* jshint ignore:start */
		oHiddFrame.onload = setPrint;
		/* jshint ignore:end */
		oHiddFrame.style.visibility = 'hidden';
		oHiddFrame.style.position = 'absolute';
		oHiddFrame.style.right = '0';
		oHiddFrame.style.bottom = '0';
		oHiddFrame.style.width = '100%';
		oHiddFrame.style.height = '100%';
		oHiddFrame.srcdoc = pages;
		document.body.appendChild(oHiddFrame);
		
		DWUtils.sendJson(this.mWSTasks, {
			Method: 'SetCurrentRecordActionStepState',
			Parameters: [{ 'Type': 'string', 'Value': this.currentProcess[0].Value}, { 'Type': 'number', 'Value': 4}, { 'Type': 'number', 'Value': 1}]
		});
		this.ProcessClientCreationStepCompleted();
	}

	DoIt(obj) {
		if ($.inArray(obj.Method, this.DWTasksProtocolOperations) !== -1) {
			this[obj.Method](obj);
		} else {
			DWUtils.log('Tasks: Undefined method - ' + obj.Method);
		}
	}
}