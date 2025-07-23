import subprocess


def perform_omr_image(working_dir, image_name):
    tiff_filename = "page.tiff"
    mei_filename = "page.mei"
    cropped_filename = "cropped.jpg"

    try:
        # Convert the image to tiff format
        convert_command = [
            "convert",
            image_name,
            "-alpha",
            "off",
            "-compress",
            "none",
            tiff_filename,
        ]
        subprocess.run(
            convert_command, cwd=working_dir, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print("Error when running 'convert'")
        print(e.stderr)
        raise RuntimeError("ErrorRunningProgram: convert")

    try:
        # Run aruspix to process the tiff image
        aruspix_command = [
            "aruspix-cmdline",
            "-m",
            "/storage/aruspix_models",
            tiff_filename,
        ]
        subprocess.run(
            aruspix_command, cwd=working_dir, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print("Error when running aruspix")
        print(e.stderr)
        raise RuntimeError("ErrorRunningProgram: aruspix")

    try:
        # Uncompress the archive to get the MEI file
        zip_command = ["unzip", "-q", "page.axz", mei_filename]
        subprocess.run(
            zip_command, cwd=working_dir, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print("Error when uncompressing archive")
        print(e.stderr)
        raise RuntimeError(f"ErrorRunningProgram: unzip [{mei_filename}]: {e.stderr}")

    try:
        # Uncompress img1.tif (the cropped image)
        zip_command = ["unzip", "-q", "page.axz", "img1.tif"]
        subprocess.run(
            zip_command, cwd=working_dir, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print("Error when uncompressing cropped image")
        print(e.stderr)
        raise RuntimeError(f"ErrorRunningProgram: unzip [img1.tif]: {e.stderr}")

    try:
        # Convert the cropped image to jpeg
        convert_command = [
            "convert",
            "img1.tif",
            "-quality",
            "100",
            cropped_filename,
        ]
        subprocess.run(
            convert_command, cwd=working_dir, capture_output=True, text=True, check=True
        )
    except subprocess.CalledProcessError as e:
        print("Error when converting cropped image to jpeg")
        print(e.stderr)
        raise RuntimeError(f"ErrorRunningProgram: convert [tif->jpeg]: {e.stderr}")
