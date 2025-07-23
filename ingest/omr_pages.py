import argparse
import concurrent.futures
import os
import shutil
import tempfile

from service import aruspix


def run_aruspix(book_directory, image_path):
    print(f"Performing OMR on {image_path}")
    aruspix_directory = os.path.join(book_directory, "aruspix")
    mei_directory = os.path.join(book_directory, "mei")
    converted_directory = os.path.join(book_directory, "converted")
    os.makedirs(aruspix_directory, exist_ok=True)
    os.makedirs(mei_directory, exist_ok=True)
    os.makedirs(converted_directory, exist_ok=True)
    image_filename = os.path.basename(image_path)
    image_without_extension = os.path.splitext(image_filename)[0]
    aruspix_filename = os.path.join(aruspix_directory, f"{image_without_extension}.axz")
    mei_filename = os.path.join(mei_directory, f"{image_without_extension}.mei")
    if os.path.exists(aruspix_filename) and os.path.exists(mei_filename):
        print("  Aruspix and MEI files already exist")
        return

    with tempfile.TemporaryDirectory() as working_dir:
        try:
            aruspix.perform_omr_image(working_dir, image_path)
            shutil.copy(
                os.path.join(working_dir, "page.mei"),
                os.path.join(mei_directory, f"{image_without_extension}.mei"),
            )
            shutil.copy(
                os.path.join(working_dir, "page.axz"),
                os.path.join(aruspix_directory, f"{image_without_extension}.axz"),
            )
            shutil.copy(
                os.path.join(working_dir, "cropped.jpg"),
                os.path.join(converted_directory, f"{image_without_extension}.jpg"),
            )
        except RuntimeError:
            pass


def single_file(image_path, output_directory):
    run_aruspix(output_directory, image_path)


def main(library_directory, subdirectory=None, threads=1):
    books = os.listdir(library_directory)
    if subdirectory:
        books = [subdirectory]
    for book in books:
        book_directory = os.path.join(library_directory, book)
        images = os.listdir(os.path.join(book_directory, "images"))
        aruspix_directory = os.path.join(book_directory, "aruspix")
        mei_directory = os.path.join(book_directory, "mei")
        os.makedirs(aruspix_directory, exist_ok=True)
        os.makedirs(mei_directory, exist_ok=True)

        print(f"Processing {book_directory} ({len(images)} images)")
        with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
            for image in images:
                image_path = os.path.join(book_directory, "images", image)
                executor.submit(run_aruspix, book_directory, image_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", "--threads", default=1, type=int)
    subparser = parser.add_subparsers(dest="command")
    single = subparser.add_parser("single", help="Run aruspix on a single file")
    all_ = subparser.add_parser("all", help="Run aruspix on all files in a directory")

    single.add_argument("image_path")
    single.add_argument("output_directory")
    all_.add_argument("library_directory")
    all_.add_argument("subdirectory", default=None)

    args = parser.parse_args()

    if args.command == "single":
        single_file(args.image_path, args.output_directory)
    elif args.command == "all":
        main(args.library_directory, args.subdirectory, args.threads)
