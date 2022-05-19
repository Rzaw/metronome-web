<template>
  <div class="container mt-2">
    <div class="d-flex justify-content-center mb-3">
      <h1 class="me-5">Metronome</h1>
      <button @click="play()" class="btn btn-primary">
        {{ isPlaying ? "Pause" : "Play" }}
      </button>
    </div>
    <div class="d-flex justify-content-center">
      <button @click="tempo--" class="btn btn-light px-3">-</button>
      <input
        type="number"
        class="form-control mx-2 w-25"
        v-model="tempo"
        placeholder="Tempo"
      />

      <button @click="tempo++" class="btn btn-light px-3">+</button>
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
      <input
        type="range"
        class="form-range"
        min="0"
        max="100"
        step="1"
        v-model="accentVolume"
        id="accentVolumeRange"
      />
      <label for="quarterVolumeRange" class="form-label h4"
        >Quarter Note
        <small style="text-muted">{{ quarterVolume }}</small></label
      >
      <input
        type="range"
        class="form-range"
        min="0"
        max="100"
        step="1"
        v-model="quarterVolume"
        id="quarterVolumeRange"
      />
      <label for="eighthVolumeRange" class="form-label h4"
        >Eighth Note <small style="text-muted">{{ eighthVolume }}</small></label
      >
      <input
        type="range"
        class="form-range"
        min="0"
        max="100"
        step="1"
        v-model="eighthVolume"
        id="eighthVolumeRange"
      />
      <label for="sixteenthVolumeRange" class="form-label h4"
        >Sixteenth Note
        <small style="text-muted">{{ sixTeenthVolume }}</small></label
      >
      <input
        type="range"
        class="form-range"
        min="0"
        max="100"
        step="1"
        v-model="sixTeenthVolume"
        id="sixteenthVolumeRange"
      />
      <label for="tripletVolumeRange" class="form-label h4"
        >Triplet <small style="text-muted">{{ tripletVolume }}</small></label
      >
      <input type="range" class="form-range" min="0" max="100" step="1" v-model="tripletVolume" id="tripletVolumeRange" />
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
      volumes: {
        master: 0.5,
        accent: 1,
        quarter: 0.75,
        eighth: 0,
        sixTeenth: 0,
        triplet: 0,
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

      osc.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      if (beatNumber % this.maxBeats === 0) {
        if (this.accentVolume > 0.25) {
          osc.frequency.value = 880.0;
          gainNode.gain.value = this.calcVolume(this.accentVolume);
        } else {
          osc.frequency.value = 440.0;
          gainNode.gain.value = this.calcVolume(this.quarterVolume);
        }
      } else if (beatNumber % 12 === 0) {
        // quarter notes = medium pitch
        osc.frequency.value = 440.0;
        gainNode.gain.value = this.calcVolume(this.quarterVolume);
      } else if (beatNumber % 6 === 0) {
        osc.frequency.value = 440.0;
        gainNode.gain.value = this.calcVolume(this.eighthVolume);
      } else if (beatNumber % 4 === 0) {
        osc.frequency.value = 300.0;
        gainNode.gain.value = this.calcVolume(this.tripletVolume);
      } else if (beatNumber % 3 === 0) {
        // other 16th notes = low pitch
        osc.frequency.value = 220.0;
        gainNode.gain.value = this.calcVolume(this.sixTeenthVolume);
      } else {
        gainNode.gain.value = 0; // keep the remaining twelvelet notes inaudible
      }

      osc.start(time);
      osc.stop(time + this.noteLength);
    },
    calcVolume(beatVolume) {
      return beatVolume * this.masterVolume;
    },
  },
  computed: {
    maxBeats() {
      return this.meter * 12;
    },
    masterVolume: {
      get() {
        return this.volumes.master * 100;
      },
      set(volume) {
        this.volumes.master = volume / 100;
      },
    },
    accentVolume: {
      get() {
        return this.volumes.accent * 100;
      },
      set(volume) {
        this.volumes.accent = volume / 100;
      },
    },
    quarterVolume: {
      get() {
        return this.volumes.quarter * 100;
      },
      set(volume) {
        this.volumes.quarter = volume / 100;
      },
    },
    eighthVolume: {
      get() {
        return this.volumes.eighth * 100;
      },
      set(volume) {
        this.volumes.eighth = volume / 100;
      },
    },
    tripletVolume: {
      get() {
        return this.volumes.triplet * 100;
      },
      set(volume) {
        this.volumes.triplet = volume / 100;
      },
    },
    sixTeenthVolume: {
      get() {
        return this.volumes.sixTeenth * 100;
      },
      set(volume) {
        this.volumes.sixTeenth = volume / 100;
      },
    },
  },
  watch: {
    volumes:{
      handler(nv) {
        if(nv.master){
          console.log(`Master, New: ${nv.master}`);
        }
        else if(nv.accent){
          console.log(`Accent, New: ${nv.accent}`);
        }
        else if(nv.quarter){
          console.log(`Quarter, New: ${nv.quarter}`);
        }
        else if(nv.eighth){
          console.log(`Eighth, New: ${nv.eighth}`);
        }
        else if(nv.triplet){
          console.log(`Triplet, New: ${nv.triplet}`);
        }
        else if(nv.sixTeenth){
          console.log(`SixTeenth, New: ${nv.sixTeenth}`);
        }
      },
      deep: true,
      immediate: true
    }
  }
};
</script>

<style>
</style>