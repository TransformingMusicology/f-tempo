import subprocess

def perform_omr_image(working_dir, image_name):
    tiff_filename = "page.tiff"
    mei_filename = "page.mei"

    try:
        # Convert the image to tiff format
        convert_command = ["convert", image_name, "-alpha", "off", "-compress", "none", tiff_filename]
        convert_status = subprocess.run(convert_command, cwd=working_dir, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print("Error when running 'convert'")
        print(e.stderr)
        raise RuntimeError("ErrorRunningProgram: convert")

    try:
        # Run aruspix to process the tiff image
        aruspix_command = ["aruspix-cmdline", "-m", "/storage/aruspix_models", tiff_filename]
        aruspix_status = subprocess.run(aruspix_command, cwd=working_dir, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print("Error when running aruspix")
        print(e.stderr)
        raise RuntimeError("ErrorRunningProgram: aruspix")

    try:
        # Uncompress the archive to get the MEI file
        zip_command = ["unzip", "-q", "page.axz", mei_filename]
        zip_status = subprocess.run(zip_command, cwd=working_dir, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print("Error when uncompressing archive")
        print(e.stderr)
        raise RuntimeError("ErrorRunningProgram: unzip")
