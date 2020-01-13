#!/bin/bash

# Script to download, recognise, encode and index a jpg file from an IIIF manifest
# *** NB Only works for manifests from D-Mbs at present ***
# Takes a command line argument of the filename/URL to process

IMG_FILE=$1
# Test whether it is from a remote URL
 if [[ "${IMG_FILE::4}" = "http" ]]
  then isURL=true; #echo ${IMG_FILE::4}" URL";
 else
  isURL=false; #${IMG_FILE::4}" Not"
 fi

if $isURL 
 then #  echo "It's a URL!!"

# Setup working location
  WORKINGPATH="process";
  mkdir $WORKINGPATH 2> /dev/null;
  rm -r $WORKINGPATH/* 2> /dev/null
  #set -e # stop if anything errors
  cd $WORKINGPATH
  #echo "Working directory: "$WORKINGPATH >> ../log
  echo "" >> ../log
	timestamp=`date --rfc-3339=seconds`
	echo $timestamp": Processing "$IMG_FILE":" >> ../log

	trunc=${IMG_FILE#https://api.digitale-sammlungen.de/iiif/image/v2/};
	id=$(dirname $trunc); 
	name="D-Mbs_"${id%/full/full/0}
	echo $name;
	
	# test only:
	curl -s $IMG_FILE -o $name.jpg

  else echo "Not a URL!!"
   exit
fi

 jpg_file=$name.jpg
 chmod a+rwx $jpg_file;

# Convert the input image to tiff, removing alpha channel
convert $jpg_file -alpha off page.tiff 2>> ../log
echo "Converted to tiff OK" >> ../log

# Run Aruspix on the converted image
aruspix-cmdline -m ../aruspix_models page.tiff 2>> ../log
echo "Passed through Aruspix OK" >> ../log

# Copy .axz file into axz folder
mkdir ../axz 2> /dev/null
cp page.axz ../axz/$name.axz

# Extract things we need from the Aruspix output
mkdir ../mei 2> /dev/null
unzip -q page.axz page.mei 2>> ../log
echo "Extracted MEI OK" >> ../log
cp page.mei ../mei/$name.mei

# Parse MEI into diatonic interval string
echo ">"$name > page.txt
awk -f ../parse_mei_to_diat_int_str.awk page.mei >> page.txt
echo "Diat interval string (fasta): " >> ../log; 
cat page.txt >> ../log; 
awk '{if(substr($0,1,1)==">") printf("%s ",substr($0,2)); else printf("%s ",$0)};'  page.txt >> ../codestrings
echo >> ../codestrings

# Make jpeg version of img1.tif from .axz and put in directory
mkdir ../jpg 2> /dev/null
unzip -q page.axz img1.tif 2>> ../log
echo -n "Page image extracted ..." >> ../log
convert img1.tif -resize 50% "../jpg/"$name".jpg" 2>> ../log
echo " and saved to jpeg" >> ../log
rm img1.tif 2> /dev/null # because unzip won't replace an existing file

# Generate maws and save them
maw -a 'PROT' -i page.txt -o $name".maw" -k 4 -K 8 2>> ../log
awk '{if(substr($0,1,1)==">") printf("%s ",substr($0,2)); else printf("%s ",$0)}' $name".maw" > $name"_oneline.maw" 
cat $name"_oneline.maw" >> ../maws
echo >> ../maws
echo >> ../log

# Generate ngrams and save them
mkdir ../ngrams 2> /dev/null
c_str=$(awk '{if(NR==2) print $0}' page.txt)
for ngr_len in {4..10}; 
 do
  echo -n "Saving "$ngr_len"grams; " >> ../log
  echo -n $name" " >> "../ngrams/"$ngr_len"_grams"
  ../str2ngram.sh $c_str $ngr_len >> "../ngrams/"$ngr_len"_grams"
 done
echo "" >>../log

