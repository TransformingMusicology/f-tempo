# use with "ports.json" - lines like: {"seg" : "DataSeg_2.json", "port" : "8003"}
#cat $1 | 
#  awk '{
#			if(($1=="[")||($1=="]")) next; 
#			split($3,a,"\""); split($6,b,"\"");
#			seg = a[2];
#			port = b[2]
#			print seg" "port
#  }' | sort -n -k 2

# use with "new_ports.json" - lines like: {"seg" : "DataSeg_2.json", "port" : "8003", "RISM" : "PL-Wn"}
jq -r '.[] | .seg + " " + .port' "$1"
