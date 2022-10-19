/**
 * LOM Parameter mapping scripts for Phototactic XY Max for Live Device
 * @author h1data
 * @since 2022
 */

autowatch = 1;
inlets = 1;
outlets = 6;

// outlet indexes
var TEXT = 0;
var OBSERVER = 1;
var ATTRIBUTE = 2;
var LABEL_PARENT = 3;
var LABEL_PARAM = 4;
var CHECK_SELECTION = 5;

/** 'X' or 'Y' */
var AXIS = jsarguments[1];

var lomSelect;
var lomParent;

var macroColor = [];
var textOnColor = [];
var isInit = false;
var isSelecting = false;
var pastId = 0;

/**
 * activate by bang from live.thisdevice
 */
function init() {
	if (isInit) return;
	isInit = true;
	if (pastId != 0) {
		setId(pastId);
	}
}

/**
 * receive color for live.text mapped mode (orange in default themes)
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @param {number} a 
 */
function setTextOnColor(r, g, b, a) {
	textOnColor = [r, g, b, a];
	if (isSelecting == false) {
		outlet(TEXT, 'activebgoncolor', textOnColor);
	}
}

/**
 * receive color for live.text mapping mode (green in default themes)
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @param {number} a 
 */
function setMacroColor(r, g, b, a) {
	macroColor = [r, g, b, a];
	if (isSelecting) {
		outlet(TEXT, 'activebgoncolor', macroColor);
	}
}

/**
 * activate/deactivate mapping mode
 * @param {number} attr 1=on, 0=off
 */
function map(attr) {
	if (attr == 1) {
		lomSelect = new LiveAPI(onSelected, 'live_set view');
		lomSelect.property = 'selected_parameter';
		isSelecting = true;
		outlet(TEXT, 'activebgoncolor', macroColor);
		outlet(CHECK_SELECTION, 'checkSelection', AXIS);
	} else if (attr == 0) {
		if (lomSelect && lomSelect.property) lomSelect.property = '';
		isSelecting = false;
		lomSelect = null;
		outlet(OBSERVER, 'id', 0);
	}
}

/**
 * check and deactivate selection mode
 * @param {any} axis 
 */
function checkSelection(axis) {
	if (isSelecting && axis != AXIS) {
		// when other map button was pressed
		setId(0);
	}
}

onSelected.local = 1;
/**
 * callback function for live_set view selected_parameter
 * @param {Array} attr 'selected_parameter', id
 */
function onSelected(attr) {
	// validate input
	if (attr[0] != 'selected_parameter') return;
	// no selection
	if (attr[2] == 0) return;

	isSelecting = false;

	// check if parameter is in the device itself
	var lomDevice = new LiveAPI('this_device');
	var thisId = lomDevice.id;
	lomParent = new LiveAPI(onChangeName, 'id', attr[2]);
	lomParent.goto('canonical_parent');
	if (lomParent.id == thisId) {
		lomParent = null;
		return;
	}
	outlet(OBSERVER, 'id', attr[2]);
}

/**
 * receive id of mapped parameter from live.observer
 * @param {number} id 
 */
function setId(id) {
	if (isInit == false) {
		pastId = id;
		return;
	}
	if (lomSelect && lomSelect.property) lomSelect.property = '';
	lomSelect = null;

	if (id == 0) {
		if (lomParent && lomParent.property) lomParent.property = '';
		lomParent = null;
		outlet(TEXT, 'set', 0);
		outlet(TEXT, 'activebgoncolor', textOnColor);
		outlet(LABEL_PARENT, 'set', '');
		outlet(LABEL_PARAM, 'set', '');
		return;
	}

	var lomParam = new LiveAPI('id', id);
	outlet(ATTRIBUTE, lomParam.get('min'), lomParam.get('max'), lomParam.get('is_quantized'));
	// 4th param is slightly smaller value than actual width because of bold font
	outlet(LABEL_PARAM, 'setwithtruncation', lomParam.get('name'), 130);
	outlet(TEXT, 'activebgoncolor', textOnColor);
	outlet(TEXT, 'set', 1);

	lomParent = new LiveAPI(onChangeName, 'id', id);
	lomParent.goto('canonical_parent');

	if (lomParent.type == 'MixerDevice' || lomParent.type == 'ChainMixerDevice') {
		// track back parents when the parent was MixerDevice
		lomParent.goto('canonical_parent');
	} 
	lomParent.property = 'name';

}

onChangeName.local = 1;
/**
 * callback function for parent name
 * @param {Array} attr 'name', id
 */
function onChangeName(attr) {
	if (attr[0] != 'name') return;
	// deal with double quarts (name with space add quarts automatically and intended quarts become \")
	outlet(LABEL_PARENT, 'setwithtruncation',
		AXIS + ': ' + attr[1].replace(/^"(.+)"$/, '$1').replace(/\\"/g, '"'),
		130);
}
