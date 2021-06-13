function CanvasRecorder(canvas, video_bits_per_sec) {
  this.start = startRecording;
  this.stop = stopRecording;
  //   this.save = download;
  this.webmUrl = "";

  this.recordedBlobs = [];
  var supportedType = null;
  var mediaRecorder = null;
  var base = this;

  var stream = canvas.captureStream();
  if (typeof stream == undefined || !stream) {
    return;
  }

  const video = document.createElement("video");
  video.style.display = "none";

  function startRecording() {
    let types = [
      "video/webm",
      "video/webm,codecs=vp9",
      "video/vp8",
      "video/webm;codecs=vp8",
      "video/webm;codecs=daala",
      "video/webm;codecs=h264",
      "video/mpeg",
    ];

    for (let i in types) {
      if (MediaRecorder.isTypeSupported(types[i])) {
        supportedType = types[i];
        break;
      }
    }
    if (supportedType == null) {
      console.log("No supported type found for MediaRecorder");
    }
    let options = {
      mimeType: supportedType,
      videoBitsPerSecond: video_bits_per_sec || 2500000, // 2.5Mbps
    };

    base.recordedBlobs = [];
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      alert("MediaRecorder is not supported by this browser.");
      console.error("Exception while creating MediaRecorder:", e);
      return;
    }

    console.log(
      "Created MediaRecorder",
      mediaRecorder,
      "with options",
      options
    );
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(100); // collect 100ms of data blobs
    console.log("MediaRecorder started", mediaRecorder);
  }

  function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      base.recordedBlobs.push(event.data);
    }
  }

  function handleStop(event) {
    console.log("Recorder stopped: ", event);
    const superBuffer = new Blob(base.recordedBlobs, { type: supportedType });
    video.src = window.URL.createObjectURL(superBuffer);
    // transcode(video.src);
    console.log(video.src);
  }

  function stopRecording() {
    mediaRecorder.stop();
    console.log("Recorded Blobs: ", base.recordedBlobs);
    video.controls = true;
  }

  //   function download(file_name) {
  //     const name = file_name || "recording.webm";
  //     const blob = new Blob(recordedBlobs, { type: supportedType });
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.style.display = "none";
  //     a.href = url;
  //     a.download = name;
  //     document.body.appendChild(a);
  //     a.click();
  //     setTimeout(() => {
  //       document.body.removeChild(a);
  //       window.URL.revokeObjectURL(url);
  //     }, 100);
  //   }
}

//WEBM TO MP4 CONVERSION

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg();
const transcode = async (recorder) => {
  await ffmpeg.load();
  const blob = new Blob(recorder.recordedBlobs, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);
  ffmpeg.FS("writeFile", "file1", await fetchFile(url));
  await ffmpeg.run("-i", "file1", "output1.mp4");
  const data = ffmpeg.FS("readFile", "output1.mp4");
  const convertedSrc = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" })
  );
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = convertedSrc;
  a.download = "exported.mp4";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(convertedSrc);
  }, 100);
};
