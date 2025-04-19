"use client"
import Webcam from "react-webcam"
import { useRef, useCallback } from "react"

const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
};

export default function CustomWebcam() {

const webcamRef = useRef(null);
const capture = useCallback(
    () => {
        // The screenshot is saved here
        const imageSrc = webcamRef.current.getScreenshot();
        console.log("Picture taken");
    },
    [webcamRef]
);
    return (
    <>
      <Webcam
        audio={false}
        height={720}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={1280}
        videoConstraints={videoConstraints}
      />
      <button onClick={capture}>Capture photo</button>
    </>

    )
}