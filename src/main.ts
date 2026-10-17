import Stats from 'stats.js';
import { GUI } from 'dat.gui';
import { gpuTiming } from './gpu_timer';
import { cpuTiming } from './cpu_timer';

import { initWebGPU, Renderer } from './renderer';
import { NaiveRenderer } from './renderers/naive';
import { ForwardPlusRenderer } from './renderers/forward_plus';
import { ClusteredDeferredRenderer } from './renderers/clustered_deferred';

import { setupLoaders, Scene } from './stage/scene';
import { Lights } from './stage/lights';
import { Camera } from './stage/camera';
import { Stage } from './stage/stage';

await initWebGPU();
setupLoaders();

let scene = new Scene();
await scene.loadGltf('./scenes/sponza/Sponza.gltf');

const camera = new Camera();
const lights = new Lights(camera);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const gui = new GUI();
gui.add(lights, 'numLights').min(1).max(Lights.maxNumLights).step(1).onChange(() => {
    lights.updateLightSetUniformNumLights();
});
gui.add(lights, 'freezeLights').name('Freeze lights');

const stage = new Stage(scene, lights, camera, stats);

var renderer: Renderer | undefined;

function setRenderer(mode: string) {
    renderer?.stop();
    cpuTiming.ms = '--';
    cpuTiming.samples = 0;

    switch (mode) {
        case renderModes.naive:
            renderer = new NaiveRenderer(stage);
            break;
        case renderModes.forwardPlus:
            renderer = new ForwardPlusRenderer(stage);
            break;
        case renderModes.forwardPlusBundles:
            renderer = new ForwardPlusRenderer(stage, true);
            break;
        case renderModes.clusteredDeferred:
            renderer = new ClusteredDeferredRenderer(stage);
            break;
        case renderModes.clusteredDeferredCompute:
            renderer = new ClusteredDeferredRenderer(stage, true);
            break;
        case renderModes.clusteredDeferredPacked:
            renderer = new ClusteredDeferredRenderer(stage, true, true);
            break;
        case renderModes.bloom:
            renderer = new ClusteredDeferredRenderer(stage, true, true, true);
            break;
    }
}

const renderModes = {
    naive: 'naive',
    forwardPlus: 'forward+',
    forwardPlusBundles: 'forward+ bundles',
    clusteredDeferred: 'clustered deferred',
    clusteredDeferredCompute: 'clustered deferred compute',
    clusteredDeferredPacked: 'clustered deferred packed',
    bloom: 'clustered deferred bloom'
};
let renderModeController = gui.add({ mode: renderModes.naive }, 'mode', renderModes);
renderModeController.onChange(setRenderer);

gui.add(gpuTiming, 'ms').name('GPU avg (ms)').listen();
gui.add(gpuTiming, 'samples').name('Samples / 120').listen();
gui.add(cpuTiming, 'ms').name('CPU encode (ms)').listen();
gui.add(cpuTiming, 'samples').name('CPU samples / 120').listen();
gui.add({ measure: () => renderer?.measureGpu() }, 'measure')
    .name('Measure again');

setRenderer(renderModeController.getValue());
