const electron = require('electron');
const {app} = electron;
const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(app.getPath('userData'),'data.json');
let data = null;

const load = () => {
	if(data !== null){return;}
	if(!fs.existsSync(dataFilePath)){
		data = {};
		return;
	}
	data = JSON.parse(fs.readFileSync(dataFilePath,'utf-8'));
};
const save = () => {
	fs.writeFileSync(dataFilePath,JSON.stringify(data));
};

exports.set = (key,val) => {
	load();
	data[key] = val;
	save();
};
exports.get = (key) => {
	load();
	let val = null;
	if(key in data) {
		val = data[key];
	}
	return val;
};
exports.unset = (key) => {
	load();
	if(key in data){
		delete data[key];
		save();
	}
};
