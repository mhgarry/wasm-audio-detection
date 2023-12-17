// import our pitch node so we can use our wasm pitch detector in this component

import PitchNode from "./PitchNode";
// async function to get our audio stream and handle our error cases
async function getWebAudioMediaStream() {
  // if the browser doesn't supoport web audio or it isn't enable throw error
  if (!window.navigator.mediaDevices) {
    throw new Error(
      "This browser does not support web audio or it is not enabled."
    );
  }
  // if there is audio and no video return it
  try {
    const result = await window.navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    return result;
  } catch (e) {
    switch (e.name) {
      case "NotAllowedError":
        // if find recording device that is turned off throw error and tell user to enable
        throw new Error(
          "A recording device was found but has been disallowed for this application. Enable the device in the browser settings."
        );
          // if no recording device was found inform user
      case "NotFoundError":
        throw new Error(
          "No recording device was found. Please attach a microphone and click Retry."
        );
      default:
        throw e;
    }
  }
}
// async function to initalize our audio once sure there are no errors
export async function setupAudio(onPitchDetectedCallback) {
  // Get the browser audio. Awaits user "allowing" it for the current tab.
  const mediaStream = await getWebAudioMediaStream();
  // create new audio window and an audio source that is fed the media stream coming into audio processor
  const context = new window.AudioContext();
  const audioSource = context.createMediaStreamSource(mediaStream);
  // define a node variable to use
  let node;

  try {
    // Fetch the WebAssembly module that performs pitch detection.
    const response = await window.fetch("wasm-audio/wasm_audio_bg.wasm");
    const wasmBytes = await response.arrayBuffer();

    // Add our audio processor
    const processorUrl = "PitchProcessor.js";
    try {
      await context.audioWorklet.addModule(processorUrl);
    } catch (e) {
      throw new Error(
        `Failed to load audio analyzer worklet at url: ${processorUrl}. Further info: ${e.message}`
      );
    }

    // use our node variable to create a new instance of the PitchNode class passing in our above defined context and the PitchProcessor
    node = new PitchNode(context, "PitchProcessor");
    // define variable to analyze 1024 audio samples
    const numAudioSamplesPerAnalysis = 1024;

    // initiate the pitch node we created with our node variable and pass in our arguments wasmBytes, onPitchDetectedCallback and numOfAudioSamplesPerAnalayisis to give our PitchNode all the data it needs
    node.init(wasmBytes, onPitchDetectedCallback, numAudioSamplesPerAnalysis);
    // connect our node to the defined audio source to anaylze against
    audioSource.connect(node);
    node.connect(context.destination);
  } catch (err) {
    // if something goes wrong with analyzer throw error
    throw new Error(
      `Failed to load audio analyzer WASM module. Further info: ${err.message}`
    );
  }
  // return our node and our context to be used in app
  return { context, node };
}
