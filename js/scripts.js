'use strict';
const electron = require('electron');
const {remote,ipcRenderer} = electron;
const main = remote.require('./main.js');
const Vue = require('vue');
const aud = document.getElementById('aud');
const ctl = document.getElementById('ctl');
const ban = document.getElementById('ban');
const cur = document.getElementById('cur');
const fav = document.getElementById('fav');
const lev = document.getElementById('lev');
const dec = document.getElementById('dec');
const inc = document.getElementById('inc');
const ds2 = document.querySelector('#dsc > ul:nth-of-type(2)');
const ds3 = document.querySelector('#dsc > ul:nth-of-type(3)');
const prv = main.prvState();
const api = {
	ndx:'http://api.shoutcast.com',
	tun:'http://yp.shoutcast.com/sbin/tunein-station.xspf',
	key:'9999999999999999'
};

let volint;
const voladj = (trg) => {
	volint = setInterval(volchg,200,trg);
};
const volset = () => {
	clearInterval(volint);
};
const voldrw = (trg) => {
	lev.querySelector('span').textContent = Math.round(aud.volume*100)+'%';
	lev.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
	stp = 240-(10*Math.round(aud.volume*100/5));
	lev.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
	lev.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
	if(trg){
		trg.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		trg.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		trg.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
	}else{
		dec.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		dec.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		dec.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
		inc.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		inc.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
		inc.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
	}
};
const volchg = (trg) => {
	if(trg != dec) {
		aud.volume = aud.volume >= 0.05 ? (Math.round(aud.volume * 100) / 100) - 0.05 : 0;
	}else{
		aud.volume = aud.volume <= 0.95 ? (Math.round(aud.volume * 100) / 100) + 0.05 : 1;
	}
	voldrw(trg);
};

const keySrt = (key) => {
	return (a,b) => {
		return a[key].toString().toLowerCase() > b[key].toString().toLowerCase() ? 1 :
			(a[key].toString().toLowerCase() < b[key].toString().toLowerCase() ? -1 : 0);
	};
};

const cma = (int) => {
	return int.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
};

const xhrTop = new XMLHttpRequest();
xhrTop.onreadystatechange = function(){
	if(this.readyState == 4 && this.status == 200){
		vm.updTop(this.responseXML.querySelector('stationlist'));
	}
};
const xhrPri = new XMLHttpRequest();
xhrPri.onreadystatechange = function(){
	if(this.readyState == 4 && this.status == 200){
		vm.updPri(JSON.parse(this.responseText).response.data.genrelist.genre);
	}
};

const actTrg = (itm) => {
	if(itm.parentNode.querySelector('li.act'))
		itm.parentNode.querySelector('li.act').classList.remove('act');
	itm.classList.add('act');
};

const curChg = (nom) => {
	cur.classList.add('chg');
	cur.dataset.name = nom;
};

const wait = (tog) => {
	tog ? document.querySelector('header,#rsp').classList.add('wait')
		: document.querySelector('header,#rsp').classList.remove('wait');
};

const fault = (msg) => {
	ctl.textContent = 'error';
	ctl.classList.add('error');
	ban.classList.add('error');
	cur.textContent = msg;
	fav.style.visibility = 'hidden';
};

let stp;
let vm = new Vue({
	el:'#rsp',
	data:{
		top:[],
		pri:[],
		sec:[],
		sta:[],
		fvs:[],
		cache:{}
	},
	methods:{
		updTop:function(xml){
			let arr = [];
			[].forEach.call(xml.querySelectorAll('stationlist > station'),(sta) => {
				arr.push({
					name:sta.getAttribute('name').replace(/http:\/\//gi,'').replace(/\//g,' ❘ '),
					genre:sta.getAttribute('genre'),
					id:sta.getAttribute('id'),
					lc:cma(sta.getAttribute('lc')),
					br:sta.getAttribute('br'),
					fvr:this.fvs.some(fv => fv.id == sta.getAttribute('id'))
				});
			});
			this.top = arr;
		},
		ovrTop:(e) => {},
		outTop:(e) => {},
		clkTop:function(e){
			actTrg(e.currentTarget);
			stream({
				id:e.currentTarget.dataset.sid,
				nom:e.currentTarget.dataset.name,
				fvr:e.currentTarget.dataset.fvr,
				br:e.currentTarget.dataset.br
			});
		},
		updPri:function(arr){
			arr.forEach((pri) => {
				if(pri.haschildren) {
					pri.cnt = pri.genrelist.genre.length;
					pri.genrelist.genre.forEach((sec) => {
						sec.cnt = sec.count ? cma(sec.count) : 0;
					});
				}
			});
			let msc = arr.find(gnr => gnr.id == 295);
			msc.name = 'Miscellaneous';
			msc.haschildren = true;
			msc.cnt = 10;
			msc.genrelist={genre:[]};
			for(let i=0;i<msc.cnt;i++){
				msc.genrelist.genre.push(
					{
						name:'Top '+cma((i*200)+1)+' &ndash; '+cma((i*200)+200),
						count:200,
						id:(9990+i),
						parentid:295,
						haschildren:false
					}
				);
			}
			this.pri = arr;
			this.cache[0] = arr;
		},
		ovrPri:(e) => {},
		outPri:(e) => {},
		clkPri:function(e){
			if(this.pri.length > 1) {
				e.currentTarget.classList.add('sel');
				ds2.classList.add('dsp');
				this.pri = [this.cache[0].find(gnr => gnr.id == e.currentTarget.dataset.gid)];
					this.sec = this.cache[0].find(gnr => gnr.id == e.currentTarget.dataset.gid).genrelist.genre;
					this.sta = [];
			} else {
				e.currentTarget.classList.remove('sel');
				ds2.classList.remove('dsp');
				ds3.classList.remove('dsp');
				this.pri = this.cache[0];
				this.sec = [];
				this.sta = [];
			}
		},
		ovrSec:(e) => {},
		outSec:(e) => {},
		clkSec:function(e){
			if(this.sec.length > 1) {
				e.currentTarget.classList.add('sel');
				ds3.classList.add('dsp');
				this.sec = [this.cache[0].find(pri => pri.id == e.currentTarget.dataset.pid).genrelist.genre.find(sec => sec.id == e.currentTarget.dataset.gid)];
				if (this.cache[e.currentTarget.dataset.gid]) {
					this.sta = this.cache[e.currentTarget.dataset.gid];
				} else {
					let ctx = {scp: this, pid: e.currentTarget.dataset.pid, gid: e.currentTarget.dataset.gid};
					xhrSecUpd(ctx);
					if(ctx.gid > 9989) {
						xhrSec.open('GET', `${api.ndx}/station/advancedsearch?genre_id=295&limit=${(ctx.gid-9990)*200},200&k=${api.key}&f=json`);
					} else {
						xhrSec.open('GET', `${api.ndx}/station/advancedsearch?genre_id=${ctx.gid}&k=${api.key}&f=json`);
					}
					xhrSec.send();
				}
			} else {
				e.currentTarget.classList.remove('sel');
				ds3.classList.remove('dsp');
				this.sec = this.cache[0].find(pri => pri.id == e.currentTarget.dataset.pid).genrelist.genre;
				this.sta = [];
			}
		},
		ovrSta:(e) => {},
		outSta:(e) => {},
		clkSta:function(e){
			actTrg(e.currentTarget);
			stream({
				id:e.currentTarget.dataset.sid,
				nom:e.currentTarget.dataset.name,
				fvr:e.currentTarget.dataset.fvr,
				br:e.currentTarget.dataset.br
			});
		},
		updFvs:function(arr){
			this.fvs = arr;
		},
		ovrFvs:(e) => {},
		outFvs:(e) => {},
		clkFvs:function(e){
			stream({
				id:e.currentTarget.dataset.sid,
				nom:e.currentTarget.dataset.name,
				fvr:1,
				br:e.currentTarget.dataset.br
			});
		},
		ovrFvrIcn:(e) => {
			e.currentTarget.textContent = 'favorite_outline';
		},
		outFvrIcn:(e) => {
			e.currentTarget.textContent = 'favorite';
		},
		clkFvrIcn:function(e){
			e.stopPropagation();
			this.fvs.$remove(this.fvs.find(fv => fv.id == e.currentTarget.dataset.sid));
			if(cur.dataset.sid == e.currentTarget.dataset.sid) {
				cur.dataset.fvr = 0;
				fav.textContent = 'favorite_outline';
			}
			ipcUpd({fvs:this.fvs});
		}
	},
	created:function(){
		xhrPri.open('GET',`${api.ndx}/genre/secondary?parentid=0&k=${api.key}&f=json`);
		xhrPri.send();
		aud.volume = prv.vol !== undefined ? prv.vol : 0.85;
		voldrw();
		this.updFvs(prv.fvs);
	}
});

const xhrSec = new XMLHttpRequest();
const xhrSecUpd = (ctx) => {
	wait(true);
	xhrSec.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200) {
			let lst = JSON.parse(this.responseText).response.data.stationlist;
			if(lst.station){
				if(lst.station.constructor === Array){
					lst.station.forEach((sta) => {
						sta.gid = ctx.gid;
						sta.name = sta.name.replace(/http:\/\//gi,'').replace(/\//g,' ❘ ');
						sta.fvr = ctx.scp.fvs.some(fv => fv.id == sta.id) ? 1 : 0;
						sta.cnt = cma(sta.lc);
					});
					ctx.scp.cache[ctx.gid] = ctx.gid < 9990 ? lst.station.sort(keySrt('name')) : lst.station;
				} else {
					lst.station.gid = ctx.gid;
					lst.station.name = lst.station.name.replace(/http:\/\//gi,'').replace('/',' ❘ ');
					lst.station.fvr = ctx.scp.fvs.some(fv => fv.id == lst.station.id) ? 1 : 0;
					lst.station.cnt = cma(lst.station.lc);
					ctx.scp.cache[ctx.gid] = [lst.station];
				}
			} else {
				ctx.scp.cache[ctx.gid] = [];
			}
			ctx.scp.sta = ctx.scp.cache[ctx.gid];
			wait(false);
		}
	};
};

const xhrSta = new XMLHttpRequest();
const stream = (prm) => {
	wait(true);
	xhrSta.onreadystatechange = function () {
		if (this.readyState == 4){
			aud.pause();
			if(this.status == 200){
				if (this.responseXML != null) {
					if (this.responseXML.querySelector('trackList>track>location')) {
						aud.removeAttribute('src');
						aud.setAttribute('src', this.responseXML.querySelector('trackList>track>location').textContent.concat('/;'));
						aud.play();
						curChg(prm.nom);
						cur.dataset.sid = prm.id;
						cur.dataset.br = prm.br;
						cur.dataset.fvr = prm.fvr;
						fav.textContent = prm.fvr != 0 ? 'favorite' : 'favorite_outline';
					} else {
						fault('no track list');
					}
				}
				else {
					fault('invalid response');
				}
			} else {
				fault(`unavailable: status code ${this.status}`);
				if(this.status > 399){
					stream(prm);
				}
			}
		}
	};
	xhrSta.open('GET', `${api.tun}?id=${prm.id}`);
	xhrSta.send();
};

aud.addEventListener('playing', () => {
	wait(false);
	ctl.textContent = 'pause_circle_outline';
	fav.style.visibility = 'visible';
	fav.textContent = cur.dataset.fvr != 0 ? 'favorite' : 'favorite_outline';
	ctl.classList.remove('disab','error');
	ban.classList.remove('disab','error');
});
aud.addEventListener('pause', () => {
	ctl.textContent = 'play_circle_outline';
});
aud.addEventListener('error', () => {
	fault('stream error');
});
aud.addEventListener('ended', () => {
	ctl.textContent = 'play_circle_outline';
	ban.classList.add('disab');
});

ctl.addEventListener('mouseenter', (e) => {
	if(aud.paused){
		e.currentTarget.textContent = 'play_circle_filled';
	} else {
		e.currentTarget.textContent = 'pause_circle_filled';
	}
});
ctl.addEventListener('mouseleave', (e) => {
	if(aud.paused){
		e.currentTarget.textContent = 'play_circle_outline';
	} else {
		e.currentTarget.textContent = 'pause_circle_outline';
	}
});
ctl.addEventListener('click', () => {
	if(!aud.paused){
		aud.pause();
	} else {
		aud.play();
	}
});

fav.addEventListener('mouseenter', (e) => {
	e.currentTarget.textContent = cur.dataset.fvr != 0 ? 'favorite_border' : 'favorite';
});
fav.addEventListener('mouseleave', (e) => {
	e.currentTarget.textContent = cur.dataset.fvr != 0 ? 'favorite' : 'favorite_border';
});
fav.addEventListener('click', (e) => {
	let fnd = vm.fvs.find(fv => fv.id == cur.dataset.sid);
	let tfv = vm.top.findIndex(fv => fv.id == cur.dataset.sid);
	if(fnd){
		vm.fvs.$remove(fnd);
		if(tfv != -1){
			vm.top[tfv].fvr = 0;
		}
		for(var key in vm.cache){
			let sfv = vm.cache[key].findIndex(sta => sta.id == cur.dataset.sid);
			if(sfv != -1){
				vm.cache[key][sfv].fvr = 0;
				break;
			}
		}
		cur.dataset.fvr = 0;
		e.currentTarget.textContent = 'favorite_border';
	} else {
		vm.fvs.push({
			id:cur.dataset.sid,
			name:cur.textContent,
			br:cur.dataset.br
		});
		vm.updFvs(vm.fvs.sort(keySrt('name')));
		if(tfv != -1) {
			vm.top[tfv].fvr = 1;
		}
		for(var key in vm.cache){
			let sfv = vm.cache[key].findIndex(sta => sta.id == cur.dataset.sid);
			if(sfv != -1){
				vm.cache[key][sfv].fvr = 1;
				break;
			}
		}
		cur.dataset.fvr = 1;
		e.currentTarget.textContent = 'favorite';
	}
	ipcUpd({fvs:vm.fvs});
});

[].forEach.call(document.querySelectorAll('nav > ul > li'),(tab) => {
	tab.addEventListener('mouseenter', (e) => {
		[].forEach.call(e.currentTarget.parentNode.childNodes,(lbl) => {
			if(lbl != e.currentTarget)lbl.style.borderBottomColor = 'transparent';
		});
	});
	tab.addEventListener('mouseleave', (e) => {
		[].forEach.call(e.currentTarget.parentNode.childNodes,(lbl) => {
			if(lbl != e.currentTarget)lbl.style.borderBottomColor = '';
		});
	});
	tab.addEventListener('click', (e) => {
		if(e.currentTarget.parentNode.querySelector('li.sel') != e.currentTarget){
			e.currentTarget.parentNode.querySelector('li.sel').classList.remove('sel');
			e.currentTarget.classList.add('sel');
			document.querySelector('#rsp > div.sel').classList.remove('sel');
			document.getElementById(e.currentTarget.dataset.sct).classList.add('sel');
			if(e.currentTarget.dataset.sct == 'top'){
				if(!vm.top.length){
					xhrTop.open('GET',`${api.ndx}/legacy/Top500?k=${api.key}&limit=200`);
					xhrTop.send();
				}
			}
		}
	});
});

cur.addEventListener('transitionend', (e) => {
	cur.classList.remove('chg');
	cur.textContent = e.target.dataset.name;
});

dec.addEventListener('mousedown', () => {
	voladj(inc);
});
dec.addEventListener('mouseup', () => {
	volset();
});
dec.addEventListener('mouseenter', (e) => {
	e.currentTarget.style.backgroundColor = '#cccccc';
	e.currentTarget.style.borderColor = '#333333';
	e.currentTarget.querySelector('span').style.color = '#333333';
});
dec.addEventListener('mouseleave', (e) => {
	e.currentTarget.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
	stp = 240-(10*Math.round(aud.volume*100/5));
	e.currentTarget.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
	e.currentTarget.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
});
dec.addEventListener('click', (e) => {
	aud.volume = aud.volume >= 0.05 ? (Math.round(aud.volume*100)/100) - 0.05 : 0;
	voldrw(inc);
	e.currentTarget.blur();
	ipcUpd({vol:aud.volume});
});
inc.addEventListener('mousedown', () => {
	voladj(dec);
});
inc.addEventListener('mouseup', () => {
	volset();
});
inc.addEventListener('mouseenter', (e) => {
	e.currentTarget.style.backgroundColor = '#cccccc';
	e.currentTarget.style.borderColor = '#333333';
	e.currentTarget.querySelector('span').style.color = '#333333';
});
inc.addEventListener('mouseleave', (e) => {
	e.currentTarget.querySelector('span').style.color = aud.volume < 0.5 ? '#000000' : '#ffffff';
	stp = 240-(10*Math.round(aud.volume*100/5));
	e.currentTarget.style.backgroundColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
	e.currentTarget.style.borderColor = 'rgb('.concat([stp,stp,stp].join(',')).concat(')');
});
inc.addEventListener('click', (e) => {
	aud.volume = aud.volume <= 0.95 ? (Math.round(aud.volume*100)/100) + 0.05 : 1;
	voldrw(dec);
	e.currentTarget.blur();
	ipcUpd({vol:aud.volume});
});

const ipcUpd = (itm) => {
	ipcRenderer.send('state',itm);
};