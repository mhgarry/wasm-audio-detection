// import our wasm package built in rust to use in our react application
import init, { WasmPitchDetector } from './wasm-audio/wasm-audio';
// intiate a pitch processor class that extends our AudioWorkletProcess class inheriting it's properties to use our WasmPitchDetector module
class PitchProcessor extends AudioWorkletProcess {
	constructor() {
		super();
		// Initialized to an array to hold samples
    this.samples = [];
    this.totalSamples = 0;

    // Listen to events from the PitchNode running on the main thread.
    this.port.onmessage = (event) => this.onmessage(event.data);
		// initially null listen on event
    this.detector = null;
  }

  onmessage(event) {
    if (event.type === "send-wasm-module") {
     // if pitchnode sends us an event then compile our wasm module
      init(WebAssembly.compile(event.wasmBytes)).then(() => {
        this.port.postMessage({ type: 'wasm-module-loaded' });
      });
    } else if (event.type === 'init-detector') {
      const { sampleRate, numAudioSamplesPerAnalysis } = event;

     // store the audio sample analysis
      this.numAudioSamplesPerAnalysis = numAudioSamplesPerAnalysis;
			// pass them into our pitch detector
      this.detector = WasmPitchDetector.new(sampleRate, numAudioSamplesPerAnalysis);

			// an array of samples to send to wasm pitch detector module
      this.samples = new Array(numAudioSamplesPerAnalysis).fill(0);
      this.totalSamples = 0;
    }
  };
	// process the input and output of our audio samples
  process(inputs, outputs) {
		// input channel array, holds different audio channels
    const inputChannels = inputs[0];

    // inputSamples holds an array of new samples to process.
    const inputSamples = inputChannels[0];

   // call the audio worker when correct number of samples are buffered
    if (this.totalSamples < this.numAudioSamplesPerAnalysis) {
      for (const sampleValue of inputSamples) {
        this.samples[this.totalSamples++] = sampleValue;
      }
    } else {

      // Shift the existing samples to make room for new samples
      const numNewSamples = inputSamples.length;
      const numExistingSamples = this.samples.length - numNewSamples;
      for (let i = 0; i < numExistingSamples; i++) {
        this.samples[i] = this.samples[i + numNewSamples];
      }
      // Add the new samples onto the end, into the 128-wide slot vacated by
      for (let i = 0; i < numNewSamples; i++) {
        this.samples[numExistingSamples + i] = inputSamples[i];
      }
      this.totalSamples += inputSamples.length;
    }

    // Once our buffer has enough samples, pass them to the Wasm pitch detector.
    if (this.totalSamples >= this.numAudioSamplesPerAnalysis && this.detector) {
      const result = this.detector.detect_pitch(this.samples);

      if (result !== 0) {
        this.port.postMessage({ type: "pitch", pitch: result });
      }
    }

    // Returning true tells the Audio system to keep going.
    return true;
  }
}

registerProcessor("PitchProcessor", PitchProcessor);