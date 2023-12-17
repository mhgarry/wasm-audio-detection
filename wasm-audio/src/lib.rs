use pitch_detection::detector::mcleod::McLeodDetector;
use pitch_detection::detector::PitchDetector;
use wasm_bindgen::prelude::*;
mod utils;
// binding between js and rust code to communicate. Makes the pitch detector and methods accessible to js
#[wasm_bindgen]
// initiate public struct and declare sample_rate, fft_size, and detector for WasmPitchDetector module
pub struct WasmPitchDetector {
  sample_rate: usize,
  fft_size: usize,
  detector: McLeodDetector<f32>,
}

#[wasm_bindgen]
// create a impl to use methods on struct
impl WasmPitchDetector {
    // create new methods to apply to our struct
    pub fn new(sample_rate: usize, fft_size: usize) -> WasmPitchDetector {
      utils::set_panic_hook();
     // define that the fft_pad, padding is, half the size of the fft_size
      let fft_pad = fft_size / 2;
     // applies fft_padding and new fft_size to our struct WasmPitchDetector
      WasmPitchDetector {
        sample_rate,
        fft_size,
        detector: McLeodDetector::<f32>::new(fft_size, fft_pad),
      }
    }
    // create a new method to pass audio samples into struct and make sure they're the correct size
    pub fn detect_pitch(&mut self, audio_samples: Vec<f32>) -> f32 {
      if audio_samples.len() < self.fft_size {
        // condition for if they aren't the correct size
        panic!("Insufficient samples passed to detect_pitch(). Expected an array containing {} elements but got {}", self.fft_size, audio_samples.len());
      }
     // define an amplitude threshold for notes to be measured against
      const POWER_THRESHOLD: f32 = 5.0;
      // set a thersohold for the clarity of the notes being measured against
      const CLARITY_THRESHOLD: f32 = 0.6;
      //set a variable optional pitch that uses the function get_pitch and it's arguments to determine the optional pitch
      let optional_pitch = self.detector.get_pitch(
        &audio_samples,
        self.sample_rate,
        POWER_THRESHOLD,
        CLARITY_THRESHOLD,
      );
      // match the optional pitch to the frequency in the library
      match optional_pitch {
        Some(pitch) => pitch.frequency,
        None => 0.0,
      }
    }
  }