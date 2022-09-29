const width = window.innerWidth;
const height = window.innerHeight;
let cubeRotation = 0.0;

function main() {
	// get webGL context
	const canvas = document.getElementById('glCanvas');
	const gl = canvas.getContext('webgl');

	if (!gl) {
		alert('No se ha podido inicializar WebGL');
		return ;
	}

	// Vertex shader program
	const vertexShaderSrc = `
		attribute vec4 aVertexPosition;
		attribute vec4 aVertexColor;
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;
		varying lowp vec4 vColor;
		void main(void) {
			gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
			vColor = aVertexColor;
		}
	`;

	// Fragment shader program
	const fragmentShaderSrc = `
		varying lowp vec4 vColor;
		void main(void) {
			gl_FragColor = vColor;
		}
	`;

	// Initialize a shader program
	const shaderProgram = initShaderProgram(gl, vertexShaderSrc, fragmentShaderSrc);

	// Collect data needed to use the shader program
	const programData = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor')
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')
		}
	}

	const buffers = initBuffers(gl);

	// Render frames
	let next = 0;
	function render(current) {
		current *= 0.001;
		const deltaTime = current - next;
		next = current;

		draw(gl, programData, buffers, deltaTime);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

function initBuffers(gl) {
	/*
	FRONT FACE
	(-1.0, 1.0, 0)        (1.0, 1.0, 0)
	V0                    V3
	X---------------------X
	|                     |
	|                     |
	|       (0, 0)        |
	|                     |
	|                     |
	X---------------------X
	V1                    V2
	(-1.0, -1.0, 0)       (1.0, -1.0, 0)
	*/

	/*
	FRONT FACE
	[
		1.0,  1.0,
		-1.0,  1.0,
		1.0, -1.0,
		-1.0, -1.0,
	];
	*/

	const vertices = [
		// Front face
		-1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

		// Back face
		-1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,

		// Top face
		-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,

		// Bottom face
		-1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,

		// Right face
		1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,

		// Left face
		-1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0
	];

	const indices = [
		// FRONT FACE
		0, 1, 2, 0, 2, 3,
		// BACK FACE
		4, 5, 6, 4, 6, 7,
		// TOP FACE
		8, 9, 10, 8, 10, 11,
		// BOTTOM FACE
		12, 13, 14, 12, 14, 15,
		// RIGHT FACE
		16, 17, 18, 16, 18, 19,
		// LEFT FACE
		20, 21, 22, 20, 22, 23,
	];

	const faceColors = [
		[0.0, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0],
		[0.0, 1.0, 0.0, 1.0]
	];
	let colors = [];

	for (var j = 0; j < faceColors.length; ++j) {
		const c = faceColors[j];
		// Repeat each color four times for the four vertices of the face
		colors = colors.concat(c, c, c, c);
	}

	// Setting up the VBO
	const vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Setting up the IBO
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	// Colors
	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

	return {
		vertices: vertexBuffer,
		indices: indexBuffer,
		color: colorBuffer,
	};
}

function draw(gl, programData, buffers, deltaTime) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	// Clear the canvas before we start drawing on it.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Camera
	const fieldOfView = 45 * Math.PI / 180;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();
	mat4.perspective(
		projectionMatrix,
		fieldOfView,
		aspect,
		zNear,
		zFar
	);

	// position drawing
	const modelViewMatrix = mat4.create();
	mat4.translate(
		modelViewMatrix,
		modelViewMatrix,
		[-0.0, 0.0, -6.0]
	);
	mat4.rotate(
		modelViewMatrix,
		modelViewMatrix,
		cubeRotation,
		[0, 0, 1]
	); // Z
	mat4.rotate(
		modelViewMatrix,
		modelViewMatrix,
		cubeRotation * 0.7,
		[0, 1, 0]
	); // Y
	mat4.rotate(
		modelViewMatrix,
		modelViewMatrix,
		cubeRotation * 0.3,
		[1, 0, 0]
	); // X

	const numComponents = 3;
	const type = gl.FLOAT; // the data in the buffer is 32bit floats
	const normalize = false;
	const stride = 0;
	const offset = 0;

	// bind VBO
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
	gl.vertexAttribPointer(
		programData.attribLocations.vertexPosition,
		numComponents,
		type,
		normalize,
		stride,
		offset
	);
	gl.enableVertexAttribArray(programData.attribLocations.vertexPosition);

	// Pull out the colors from the color buffer into the vertexColor attribute.
	{
	const numComponents = 4;
	const type = gl.FLOAT;
	const normalize = false;
	const stride = 0;
	const offset = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
	gl.vertexAttribPointer(
		programData.attribLocations.vertexColor,
		numComponents,
		type,
		normalize,
		stride,
		offset
	);
	gl.enableVertexAttribArray(programData.attribLocations.vertexColor);
	}

	// bind IBO
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// Tell WebGL to use our program when drawing
	gl.useProgram(programData.program);

	// Set the shader uniforms
	gl.uniformMatrix4fv(
		programData.uniformLocations.projectionMatrix,
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		programData.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix
	);

	// Draw to the scene using triangles
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

	cubeRotation += deltaTime;

	// Clean
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function initShaderProgram(gl, vertexShaderSrc, fragmentShaderSrc) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);

	// Create the shader program
	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// Check if creating the shader program failed
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert(`Unable to initialize the shader program: ${gl.getProgramDataLog(shaderProgram)}`);
		return null;
	}

	return shaderProgram;
}

function loadShader(gl, type, src) {
	const shader = gl.createShader(type);

	// Send the source to the shader object
	gl.shaderSource(shader, src);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(`Error compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

window.onload = main;