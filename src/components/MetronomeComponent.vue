<template>
  <div class="container">
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
        placeholder="name@example.com"
      />

      <button @click="tempo++" class="btn btn-light px-3">+</button>
    </div>
    <input
      type="range"
      class="form-range"
      v-model="tempo"
      min="20"
      max="400"
      step="0.1"
      id="customRange3"
    />
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
      masterVolume: 0.5,
      accentVolume: 1,
      quarterVolume: 0.75,
      eighthVolume: 0,
      sixteenthVolume: 0,
      tripletVolume: 0,
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
      var secondsPerBeat = 60.0 / this.tempo;
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
        gainNode.gain.value = this.calcVolume(this.sixteenthVolume);
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
  },
};
</script>

<style>
</style>