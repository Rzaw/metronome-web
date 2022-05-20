<template>
  <div class="container mt-2">
    <div class="d-flex justify-content-center mb-3">
      <h1 class="">Metronome</h1>
    </div>
    <div class="d-flex justify-content-end">
      <div><span></span></div>
      <div class="w-75 d-flex">
        <button @click="tempo--" class="btn btn-light px-3">-</button>

        <input
          type="number"
          class="form-control mx-2 w-25"
          v-model="tempo"
          placeholder="Tempo"
        />

        <button @click="tempo++" class="btn btn-light px-3">+</button>
      </div>
      <div>
        <button @click="play()" class="btn btn-primary">
          {{ isPlaying ? "Pause" : "Play" }}
        </button>
      </div>
    </div>
    <label for="tempoRange" class="form-label">Tempo range</label>
    <input
      type="range"
      class="form-range"
      v-model="tempo"
      min="20"
      max="400"
      step="0.1"
      id="tempoRange"
    />

    <div class="">
      <h2>Mixer</h2>
      <label for="masterVolumeRange" class="form-label h3"
        >Master <small style="text-muted">{{ masterVolume }}</small></label
      >
      <input
        type="range"
        class="form-range"
        min="0"
        max="100"
        step="1"
        v-model="masterVolume"
        id="masterVolumeRange"
      />

      <label for="accentVolumeRange" class="form-label h4"
        >Accent <small style="text-muted">{{ accentVolume }}</small></label
      >
      <div class="d-flex">
        <input
          class="form-check-input me-2"
          type="checkbox"
          v-model="soundManager.accent.enabled"
        />
        <input
          type="range"
          class="form-range"
          min="0"
          max="100"
          step="1"
          v-model="accentVolume"
          id="accentVolumeRange"
        />
        <input class="form-control ms-2" style="width: 20%" type="number" v-model="soundManager.accent.frequency">
      </div>

      <label for="quarterVolumeRange" class="form-label h4"
        >Quarter Note
        <small style="text-muted">{{ quarterVolume }}</small></label
      >
      <div class="d-flex">
        <input
          class="form-check-input me-2"
          type="checkbox"
          v-model="soundManager.quarter.enabled"
        />
        <input
          type="range"
          class="form-range"
          min="0"
          max="100"
          step="1"
          v-model="quarterVolume"
          id="quarterVolumeRange"
        />
      </div>

      <label for="eighthVolumeRange" class="form-label h4"
        >Eighth Note <small style="text-muted">{{ eighthVolume }}</small></label
      >
      <div class="d-flex">
        <input
          class="form-check-input me-2"
          type="checkbox"
          v-model="soundManager.eighth.enabled"
        />
        <input
          type="range"
          class="form-range"
          min="0"
          max="100"
          step="1"
          v-model="eighthVolume"
          id="eighthVolumeRange"
        />
      </div>

      <label for="sixteenthVolumeRange" class="form-label h4"
        >Sixteenth Note
        <small style="text-muted">{{ sixTeenthVolume }}</small></label
      >
      <div class="d-flex">
        <input
          class="form-check-input me-2"
          type="checkbox"
          v-model="soundManager.sixTeenth.enabled"
        />
        <input
          type="range"
          class="form-range"
          min="0"
          max="100"
          step="1"
          v-model="sixTeenthVolume"
          id="sixteenthVolumeRange"
        />
      </div>

      <label for="tripletVolumeRange" class="form-label h4"
        >Triplet <small style="text-muted">{{ tripletVolume }}</small></label
      >
      <div class="d-flex">
        <input
          class="form-check-input me-2"
          type="checkbox"
          v-model="soundManager.triplet.enabled"
        />
        <input
          type="range"
          class="form-range"
          min="0"
          max="100"
          step="1"
          v-model="tripletVolume"
          id="tripletVolumeRange"
        />
      </div>
    </div>
    <div>
      <h2>Song Library</h2>
    </div>
  </div>
</template>

<script>
export default {
  name: "MetronomeComponent",
  data() {
    return {
      audioContext: null,
      timerWorker: null,
      isPlaying: false,
      //startTime,
      //currentTwelveletNote,
      tempo: 120.0,
      meter: 4,
      soundManager: {
        master: {
          volume: 0.5,
          enabled: true,
        },
        accent: {
          volume: 1,
          enabled: true,
          frequency: 880,
        },
        quarter: {
          volume: 0.75,
          enabled: true,
          frequency: 440,
        },
        eighth: {
          volume: 0,
          enabled: true,
          frequency: 440,
        },
        sixTeenth: {
          volume: 0,
          enabled: true,
          frequency: 220,
        },
        triplet: {
          volume: 0,
          enabled: true,
          frequency: 300,
        },
      },
      lookahead: 25.0,
      scheduleAheadTime: 0.1,
      nextNoteTime: 0.0,
      noteLength: 0.05,
      notesInQueue: [],
    };
  },
  mounted() {
    this.audioContext = new AudioContext();
    this.timerWorker = new Worker("old/assets/js/worker.js");

    const fn_sche = this.scheduler;

    this.timerWorker.onmessage = function (e) {
      if (e.data == "tick") {
        // console.log(this);
        fn_sche();
      } else {
        console.log("message: " + e.data);
      }
    };

    this.timerWorker.postMessage({ interval: this.lookahead });
  },
  methods: {
    nextTwelvelet() {
      let secondsPerBeat = 60.0 / this.tempo;
      this.nextNoteTime += 0.08333 * secondsPerBeat; // Add beat length to last beat time
      this.currentTwelveletNote++; // Advance the beat number, wrap to zero

      if (this.currentTwelveletNote == this.maxBeats) {
        this.currentTwelveletNote = 0;
      }
    },

    play() {
      this.isPlaying = !this.isPlaying;

      if (this.isPlaying) {
        this.currentTwelveletNote = 0;
        this.nextNoteTime = this.audioContext.currentTime;
        this.timerWorker.postMessage("start");
      } else {
        this.timerWorker.postMessage("stop");
      }
    },

    scheduler() {
      while (
        this.nextNoteTime <
        this.audioContext.currentTime + this.scheduleAheadTime
      ) {
        this.scheduleNote(this.currentTwelveletNote, this.nextNoteTime);
        this.nextTwelvelet();
      }
    },

    scheduleNote(beatNumber, time) {
      // push the note on the queue, even if we're not playing.
      this.notesInQueue.push({ note: beatNumber, time: time });

      // create oscillator & gainNode & connect them to the context destination

      let osc = this.audioContext.createOscillator();
      let gainNode = this.audioContext.createGain();
      let panNode = this.audioContext.createStereoPanner();

      // this.audioContext.

      osc.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.audioContext.destination);

      if (beatNumber % this.maxBeats === 0 && this.soundManager.accent.enabled) {
        osc.frequency.value = this.soundManager.accent.frequency;
        gainNode.gain.value = this.calcVolume(this.accentVolume);
        
        // if (this.accentVolume > 0.25) {
        //   osc.frequency.value = this.soundManager.accent.frequency;
        //   gainNode.gain.value = this.calcVolume(this.accentVolume);
        // } else {
        //   osc.frequency.value = this.soundManager.quarter.frequency;
        //   gainNode.gain.value = this.calcVolume(this.quarterVolume);
        // }
      } else if (beatNumber % 12 === 0 && this.soundManager.quarter.enabled) {
        // quarter notes = medium pitch
        osc.frequency.value = this.soundManager.quarter.frequency;
        gainNode.gain.value = this.calcVolume(this.quarterVolume);
      } else if (beatNumber % 6 === 0 && this.soundManager.eighth.enabled) {
        osc.frequency.value = this.soundManager.eighth.frequency;
        gainNode.gain.value = this.calcVolume(this.eighthVolume);
      } else if (beatNumber % 4 === 0 && this.soundManager.triplet.enabled) {
        osc.frequency.value = this.soundManager.triplet.frequency;
        gainNode.gain.value = this.calcVolume(this.tripletVolume);
      } else if (beatNumber % 3 === 0 && this.soundManager.sixTeenth.enabled) {
        // other 16th notes = low pitch
        osc.frequency.value = this.soundManager.sixTeenth.frequency;
        gainNode.gain.value = this.calcVolume(this.sixTeenthVolume);
      } else {
        gainNode.gain.value = 0; // keep the remaining twelvelet notes inaudible
      }

      osc.start(time);
      osc.stop(time + this.noteLength);
    },
    calcVolume(beatVolume) {
      return (beatVolume * this.masterVolume) / 10000;
    },
  },
  computed: {
    maxBeats() {
      return this.meter * 12;
    },
    masterVolume: {
      get() {
        return this.soundManager.master.volume * 100;
      },
      set(volume) {
        this.soundManager.master.volume = volume / 100;
      },
    },
    accentVolume: {
      get() {
        return this.soundManager.accent.volume * 100;
      },
      set(volume) {
        this.soundManager.accent.volume = volume / 100;
      },
    },
    quarterVolume: {
      get() {
        return this.soundManager.quarter.volume * 100;
      },
      set(volume) {
        this.soundManager.quarter.volume = volume / 100;
      },
    },
    eighthVolume: {
      get() {
        return this.soundManager.eighth.volume * 100;
      },
      set(volume) {
        this.soundManager.eighth.volume = volume / 100;
      },
    },
    tripletVolume: {
      get() {
        return this.soundManager.triplet.volume * 100;
      },
      set(volume) {
        this.soundManager.triplet.volume = volume / 100;
      },
    },
    sixTeenthVolume: {
      get() {
        return this.soundManager.sixTeenth.volume * 100;
      },
      set(volume) {
        this.soundManager.sixTeenth.volume = volume / 100;
      },
    },
  },
  watch: {
    //   volumes:{
    //     handler(nv) {
    //       if(nv.master){
    //         console.log(`Master, New: ${nv.master}`);
    //       }
    //       if(nv.accent != this.volumes.accent){
    //         console.log(`Accent, New: ${nv.accent}`);
    //       }
    //       if(nv.quarter != this.volumes.quarter){
    //         console.log(`Quarter, New: ${nv.quarter}`);
    //       }
    //       if(nv.eighth != this.volumes.eighth){
    //         console.log(`Eighth, New: ${nv.eighth}`);
    //       }
    //       if(nv.triplet != this.volumes.triplet){
    //         console.log(`Triplet, New: ${nv.triplet}`);
    //       }
    //       if(nv.sixTeenth != this.volumes.sixTeenth){
    //         console.log(`SixTeenth, New: ${nv.sixTeenth}`);
    //       }
    //     },
    //     deep: true,
    //     immediate: true
    //   }
  },
};
</script>

<style>
</style>