import subprocess

MAW_PATH = ""

class CannotRunMawError(Exception):
    pass

def get_maws_for_codestrings(codestrings):
    if len(codestrings) > 100:
        print("Warning: Getting maws for more than 100 items at once can be buggy")

    input_array = [f">{id}:\n{codestring}" for id, codestring in codestrings.items()]
    input_str = '\n'.join(input_array) + '\n'

    maw_command = [
        maw_path, "-a", "PROT", "-i", "-", "-o", "-", "-k", "4", "-K", "8"
    ]

    try:
        maws = subprocess.run(
            maw_command,
            input=input_str,
            text=True,
            capture_output=True,
            check=True
        )
    except subprocess.CalledProcessError:
        raise CannotRunMawError("Error when computing maws")

    if maws.returncode != 0:
        raise CannotRunMawError("Error when computing maws")

    maws_output = maws.stdout
    output = {}
    current_key = ''
    
    for line in maws_output.split('\n'):
        if line.startswith(">"):
            current_key = line.replace(">", "").replace(":", "")
            output[current_key] = []
        else:
            if line:
                output[current_key].append(line)

    return output
