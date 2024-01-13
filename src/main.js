import * as THREE from 'three';
import { particleSystem, updateParticles } from './smoke.js';

//SHADER STUFF FOR BURNING TIP
const vertexShader = `
//varying means vUv will be shared among the vertex and fragment shader
  varying vec2 vUv;
  uniform float iTime;
  //the main function of the shader
  void main() {
    // Pass the UV coordinates to the fragment shader
    vUv = uv;
    
    //gives the position of each vertex in screen space, projectionMatrix modelVewMatrix and position are provided by THREE
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  }
`;
// Define a fragment shader
const fragmentShader = `
//passed from vertexShader
  varying vec2 vUv;
  //passed from javascript code, which is why its uniform
  uniform float iTime;
  uniform vec2 iResolution;
  uniform float noiseDirectionDot; 


  // Shadertoy functions
  
  //provides psuedo random number based on coordinates
  float rand(vec2 n) {
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }
  //provides circular gradient(design element where colors fade into others) for burning end
  float radialGradient(vec2 coordinate, vec2 center, float scale) {
    //increasing the scale means the gradient becomes smaller, concentrating towards the center
    //decreasing it means the gradient spreads out, covering a larger area(which is more so what i want)
      float distance = length((coordinate - center) * scale);
    //distance determines how smoothstep interpolates the values for the gradient, closer to the center will have smaller values and vice versa
    // subtracting from 1 inverts it, which makes the center the brightest part and the farther way parts darker
      return 1.0 - smoothstep(0.0, 1.0, distance);
  }

  float basicNoise(vec2 coord) {
    // Use the pre-calculated dot product
    return fract(sin(noiseDirectionDot * (coord.x + coord.y)) * 43758.545);
  }

  float fBm(vec2 coordinate, float time) {
      float total = 0.0;
      //intensity of the noise
      float amplitude = 0.5;
      //fineness of the noise details
      float frequency = 1.0;
      //controls how much intensity(amplitude) goes down with each octave
      float persistence = 0.5;
      float maxAmplitude = 0.0;

      for(int i = 0; i < 2; i++) {
        //generates noise based on the coordinate, scaled with frequency adjusted over time, multiplying by amplitude scales the noise intensity
        //all in all, this line gives the total noise value each time a loop is done
          total += basicNoise(coordinate * frequency + time) * amplitude;
          maxAmplitude += amplitude;
          //reduces intensity of sebsequent layers
          amplitude *= persistence;
          //doubles the detail in each sebsequent octave
          frequency *= 2.0;
      }
      //keeps noise value betwee 0 and 1
      return total / maxAmplitude;
  }

  vec3 magmaColor(float t) {
      const vec3 darkRed = vec3(0.5, 0, 0);
      const vec3 midRed = vec3(0.8, 0.1, 0);
      const vec3 brightRed = vec3(1.0, 0.2, 0);
      const vec3 brightOrange = vec3(1.0, 0.5, 0.0);
      const vec3 yellow = vec3(1.0, 0.9, 0.2);
      const vec3 white = vec3(1.0, 1.0, 1.0);

      vec3 color;
      if (t < 0.2) {
          color = mix(darkRed, midRed, smoothstep(0.0, 0.2, t));
      } else if (t < 0.4) {
          color = mix(midRed, brightRed, smoothstep(0.2, 0.4, t));
      } else if (t < 0.6) {
          color = mix(brightRed, brightOrange, smoothstep(0.4, 0.6, t));
      } else if (t < 0.8) {
          color = mix(brightOrange, yellow, smoothstep(0.6, 0.8, t));
      } else {
          color = mix(yellow, white, smoothstep(0.8, 1.0, t));
      }
      return color;
  }

  // Main rendering logic
  void main() {
      vec2 uv = vUv;
      uv = uv * 2.0 - 1.0; // Transform UV coordinates
      
      float timeScaled = iTime * 2.0;
      float expansion = sin(timeScaled) * 0.1 + 0.4;
      float noiseValue = fBm(uv, iTime * 0.000002);
      float gradient = radialGradient(uv, vec2(0.0, 0.0), expansion * 1.6);
      noiseValue *= gradient;
      vec3 col = magmaColor(noiseValue);

      gl_FragColor = vec4(col, 1.0);
  }
`;
// Calculate the dot product outside of shader and pass it as a uniform
//WHY DOES THIS WORK?!
const noiseDirection = new THREE.Vector2(12.99, 78.23);
const dotProduct = noiseDirection.dot(new THREE.Vector2(1, 1)); 
// Create a ShaderMaterial with the updated shaders
const shaderMaterial = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    noiseDirectionDot: { value: dotProduct } // Pass this pre-calculated value to the shader
  }
});

//CIG BODY SHADER
//UNDERSTAND BELOW CODE
const cigVertexShader = `
  varying vec2 vUv; // Declare the varying

  void main() {
    vUv = uv; // Pass the UV coordinates
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cigFragmentShader = `

float noise(vec2 co) {
  // Scale the coordinates to change the noise frequency
  vec2 scaledCo = co * 0.9; // noiseScale is a float > 1.0 to increase frequency
  return fract(sin(dot(scaledCo.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// getGrad function as defined in your ShaderToy code
vec2 getGrad(vec2 uv, float delta) {
    vec2 d = vec2(delta, 0);
    return vec2(
        noise(uv + d.xy) - noise(uv - d.xy),
        noise(uv + d.yx) - noise(uv - d.yx)
    ) / delta;
}

varying vec2 vUv; // UV coordinates from vertex shader
uniform vec2 iResolution; // Resolution uniform

void main() {
  // Convert UV to fragment coordinates
  vec2 fragCoord = vUv * iResolution;

  // Calculate the noise-based texture
  vec3 n = vec3(getGrad(fragCoord, 1.0), 1.0);
  n = normalize(n);
  n = n * 2.0 - 1.0; // Adjust contrast of the texture
  float paperTexture = dot(vec3(1.0, 1.0, 0.0), n);
  vec3 texturedColor = vec3((paperTexture * 0.05) + 0.95);

  // Define the filter color
  vec3 filterBaseColor = vec3(0.9, 0.55, 0.2); // Muted orange/brown color for the filter

  // Apply the same texture effect to the filter color
  vec3 filterTextureColor = filterBaseColor * texturedColor;

  // Blend between the textured paper color and the textured filter color
  float filterStart = 0.65; // Start of the filter (two-thirds down the cigarette)
  float blendFactor = smoothstep(filterStart - 0.1, filterStart, vUv.y);
  vec3 color = mix(texturedColor, filterTextureColor, blendFactor);

  gl_FragColor = vec4(color, 1.0);
}


`;

const cigShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: cigVertexShader,
  fragmentShader: cigFragmentShader,
  uniforms: {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  }
});
////UNDERSTAND ABOVE CODE
// Create the scene
const scene = new THREE.Scene();
//cigarette and burning tip attributes
const radius = 0.2; // small radius for a cigarette
const height = 4; // longer height
const tipHeight = 0.05; //height of cig tip
const radialSegments = 32; // adjust this for smoothness
// Create the cylinder geometry
const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
// Define the size of the cigarette tip
const tipGeometry = new THREE.CylinderGeometry(radius, radius, tipHeight, radialSegments);
let tipWorldPos = new THREE.Vector3(); // Placeholder for now
// //material for cylinder/cigarette
// const material = new THREE.MeshStandardMaterial({ color: 0xfafafa });
const mesh = new THREE.Mesh(geometry, cigShaderMaterial);
// Create the mesh for the tip using the shader material
const tipMesh = new THREE.Mesh(tipGeometry, shaderMaterial);
mesh.add(tipMesh);
scene.add(mesh);
// Rotate the mesh
//figure out why this works
mesh.rotation.x = -Math.PI / 2; // Rotates the cylinder to face the screen
mesh.rotation.z = Math.PI / -10;  // Adjusts the tilt to the left
tipMesh.position.y = -height / 2 - tipHeight / 2;
scene.add(particleSystem);
// Lights for the scene
const light = new THREE.DirectionalLight(0xffffff, 1); // White directional light
light.position.set(5, 0, 5);
light.intensity = 2.5; // Increase this value to brighten the light
scene.add(light);
// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
camera.position.z = 5;
scene.add(camera);
// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: false // This is usually the default, but it's stated explicitly here
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // Append the renderer to the body
let startTime = Date.now(); // Record the start time
let oldTime = Date.now();

// Update the animate function
const animate = () => {
  requestAnimationFrame(animate);
  // Update the world position of the tip
  tipMesh.getWorldPosition(tipWorldPos);
  // Calculate delta time
  let newTime = Date.now();
  let deltaTime = (newTime - oldTime) / 1000; // Convert to seconds
  oldTime = newTime;
  // Update the world position of the cigarette tip
  tipMesh.getWorldPosition(tipWorldPos);
  // Update particles
  updateParticles(tipWorldPos, deltaTime);
  let elapsedTime = (newTime - startTime) * 0.001;
  shaderMaterial.uniforms.iTime.value = elapsedTime;
  renderer.render(scene, camera);
};

animate();
