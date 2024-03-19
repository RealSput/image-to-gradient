require('@g-js-api/g.js');
const fs = require('fs');
const Jimp = require('jimp');

const rgb2hsv = (r, g, b) => {
    let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
    rabs = r / 255;
    gabs = g / 255;
    babs = b / 255;
    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;
    percentRoundFn = num => Math.round(num * 100) / 100;
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    let [hue, saturation, brightness] = [Math.round(h * 360), percentRoundFn(s * 100) / 100, percentRoundFn(v * 100) / 100]
	return `${hue}a${saturation}a${brightness}a0a0`;
}
let ord = -1000;
let grad_id = -50000;
const quad = (bl, br, tl, tr, col = 1, bgr = 1, layer, col2 = col, addBlend = false, customHSV = false) => {
	const hsv = customHSV ? customHSV : `0a1a${bgr}a0a0`;
	const o = {
		OBJ_ID: 2903,
		X: (grad_id + 50000) * 10 * 30,
		ORD: ord,
		GR_BL: bl,
		GR_BR: br,
		GR_TL: tl,
		GR_TR: tr,
		GR_ID: grad_id,
		COLOR: col,
		COLOR_2: col2,
		GR_BLENDING: addBlend ? 1 : 0,
		PREVIEW_OPACITY: 1,
		COLOR_2_HVS_ENABLED: true,
		COLOR_2_HVS: hsv,
		GR_VERTEX_MODE: true,
		GR_LAYER: layer
	};
	let jhsv = !customHSV ? '0' : customHSV;
	let joined = [grad_id, bl.value, br.value, tl.value, tr.value, col.value, col2.value, layer, jhsv].join(',');
	$.add(o);
	ord++;
	grad_id++;
};
const tri = (v1, v2, v3, col = 1, bgr = 1, layer, col2 = col, addBlend = false, customHSV = false) => quad(v1, v2, v3, v3, col, bgr, layer, col2, addBlend, customHSV); 

let invis_color = unknown_c();
invis_color.set(rgba(0, 0, 0, 0), 0, true);
let black_color = unknown_c();
black_color.set([0, 0, 0], 0);
let red_color = unknown_c();
red_color.set([255, 0, 0]);

(async () => {
	if (!process.argv[2]) throw new Error("The image argument was not found in this command! Run this script like: `node . [YOUR IMAGE FILE HERE W/ EXTENSION, THIS IS A PLACEHOLDER]`");
	const image = await Jimp.read(process.argv[2]);
	image.flip(false, true);
	let widthPixels = image.bitmap.width;
	let heightPixels = image.bitmap.height;

	function pixelsToMeters(pixels, dpi = 96) {

		const metersPerInch = 0.0254;
		const inches = pixels / dpi;
		const meters = inches * metersPerInch;
		return meters;
	}

	let vertices = [
		[-0.5, 0, -0.5], 
		[0.5, 0, -0.5], 
		[0.5, 0, 0.5], 
		[-0.5, 0, 0.5] 
	];

	let faces = [
		[0, 1, 2],
		[0, 2, 3]
	];

	function subdivide(vertices, faces) {
		let newFaces = [];
		let count = vertices.length;

		for (let face of faces) {

			let midpoints = face.map((value, index, array) => {
				let nextIndex = (index + 1) % array.length;
				let midpoint = [
					(vertices[value][0] + vertices[array[nextIndex]][0]) / 2,
					(vertices[value][1] + vertices[array[nextIndex]][1]) / 2,
					(vertices[value][2] + vertices[array[nextIndex]][2]) / 2
				];
				vertices.push(midpoint);
				return count++;
			});

			newFaces.push([face[0], midpoints[0], midpoints[2]]);
			newFaces.push([face[1], midpoints[1], midpoints[0]]);
			newFaces.push([face[2], midpoints[2], midpoints[1]]);
			newFaces.push([midpoints[0], midpoints[1], midpoints[2]]);
		}

		return newFaces;
	}

	let widthMeters = pixelsToMeters(widthPixels);
	let heightMeters = pixelsToMeters(heightPixels);

	while (vertices.length * 3 < 9999) {
		faces = subdivide(vertices, faces);
	}

	const translateX = widthPixels / 2;
	const translateY = heightPixels / 2;

	let obj = ``;
	for (let vertex of vertices) {
		let y = vertex[1];
		vertex[1] = -vertex[2];
		vertex[2] = y;
	}

	for (let vertex of vertices) {
		vertex[0] *= widthMeters;
		vertex[1] *= heightMeters;
	}

	let vertexToGid = {};
	let vert_colors = {};

	let objFileContent = '';
	let vi = 0;
	for (let vertex of vertices) {
		vertexToGid[vi] = unknown_g();
		let o = {
			OBJ_ID: 1764,
			X: vertex[0] * 5000,
			Y: vertex[1] * 5000,
			GROUPS: vertexToGid[vi],
			COLOR: invis_color
		};
		$.add(o);
		obj += `v ${vertex.join(' ')}\n`;
		vi++;
	}
	function getColorAtVertex() {
		for (let i = 0; i < vertices.length; i++) {
			let vertex = vertices[i];
			vertex[2] = 1; 

			let sw = widthPixels / 2;
			let sh = heightPixels / 2;
			let screenX = Math.round((vertex[0] / widthMeters) * widthPixels + translateX);
			let screenY = Math.round((vertex[1] / heightMeters) * heightPixels + translateY);

			screenX = Math.max(0, Math.min(screenX, widthPixels - 1));
			screenY = Math.max(0, Math.min(screenY, heightPixels - 1));

			const colorInt = image.getPixelColor(screenX, screenY );
			const { r, g, b } = Jimp.intToRGBA(colorInt);
			vert_colors[i] = [r, g, b];

		}
	}

	getColorAtVertex();
	for (let face of faces) {
		let [v1, v2, v3] = [vertexToGid[face[0]], vertexToGid[face[1]], vertexToGid[face[2]]];
		obj += `f ${face.map(x => x + 1).join(' ')}\n`;
		let depth = 1;
		let gface = [{vs: [v3, v1, v2], depth, c1: black_color, c2: red_color, bgr: 1, blending: false}, {vs: [v1, v2, v3], depth, c1: black_color, c2: red_color, bgr: 1, blending: true}, {vs: [v2, v3, v1], depth, c1: black_color, c2: red_color, bgr: 1, blending: true}];
		gface = gface.map((x, i) => {
			x.hsvc = rgb2hsv(...vert_colors[face[i]]); 
			return x;
		});
		gface.forEach(f => {
			tri(f.vs[0], f.vs[1], f.vs[2], f.c1, f.bgr, depth, f.c2, f.blending, f.hsvc);
		})
	}
	fs.writeFileSync('out.obj', obj);
	$.exportToSavefile({ info: true });
})();
