const eventThrottler = () => {
    var throttle = function(type, name, obj) {
        obj = obj || window
        var running = false
        var func = function() {
            if (running) { return }

            running = true;
            window.requestAnimationFrame((timestamp) => {
                obj.dispatchEvent(new CustomEvent(name))
                running = false;
            })
        }
        obj.addEventListener(type, func)
    }

    throttle("resize", "windowResize")
}

eventThrottler()

if ('serviceWorker' in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then(res => console.log("Service Worker Registered!"))
            .catch(err => console.log(err))
    })
}

if (navigator.mediaDevices || window.MediaStreamTrackProcessor) {
    const body = document.querySelector('body')
    const addVideoButton = document.getElementById('add_video')
    const videobox = document.getElementById('videobox')

    var captureProcess = {}
    var processID = 0

    addVideoButton.addEventListener('click', (event) => {
        var videoContainer = document.createElement('div')
        videoContainer.classList.add('video_container')

        videoContainer.style.width = videobox.style.width
        videoContainer.style.height = videobox.style.height

        var canvasVideo = document.createElement('canvas')
        videoContainer.appendChild(canvasVideo)

        navigator.mediaDevices.getUserMedia({video: false, audio: true}).then((stream) => {
            document.querySelector("#test_stream").srcObject = stream
        })

        navigator.mediaDevices.getDisplayMedia({video: true, audio: true}).then((stream) => {
            const makeProcess = (stream, canvasVideo, videoContainer) => {
                const processor = new MediaStreamTrackProcessor(stream.getVideoTracks()[0])
                const reader = processor.readable.getReader()
                stream.getAudioTracks()

                const ctx = canvasVideo.getContext('2d', { alpha: false })
                var stopCompute = false
                var chunkLock = false

                const computeFrame = (timestamp) => {
                    if (!stream.active) {
                        videoContainer.remove()
                        return
                    }

                    try {
                        readChunk()

                        async function readChunk() {
                            if (!chunkLock) {
                                chunkLock = true
                                reader.read().then( ({done, value}) => {
                                    if (value.displayWidth != canvasVideo.width) { canvasVideo.width = value.displayWidth}
                                    if (value.displayHeight != canvasVideo.height) { canvasVideo.height = value.displayHeight}

                                    ctx.drawImage(value, 0, 0)
                                    value.close()

                                    chunkLock = false

                                    if (done) {
                                        stopCompute = true
                                    }
                                })
                            }
                        }

                        if (!stopCompute) {
                            window.requestAnimationFrame(computeFrame)
                        }
                    } catch (err) {}
                }

                return computeFrame;
            }

            captureProcess[processID] = makeProcess(stream, canvasVideo, videoContainer)
            canvasVideo.dataset.captureProcess = window.requestAnimationFrame(captureProcess[processID])

            processID++
            videobox.appendChild(videoContainer)
        })
    })

    repositioner = (event) => {
        if (body.offsetWidth / 16 * 9 > body.offsetHeight * 0.7) {
            videobox.style.height = `${body.offsetHeight * 0.7}px`
            videobox.style.width = `${body.offsetHeight * 0.7 / 9 * 16}px`
        } else {
            videobox.style.width = `${body.offsetWidth}px`
            videobox.style.height = `${body.offsetWidth / 16 * 9}px`
        }

        document.querySelectorAll(".video_container").forEach((element) => {
            element.style.width = videobox.style.width
            element.style.height = videobox.style.height
        })
    }

    window.addEventListener('windowResize', repositioner)
    repositioner()
} else {
    alert('이 브라우저는 지원되지 않습니다!');
}
