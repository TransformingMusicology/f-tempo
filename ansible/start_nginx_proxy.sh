# Start nginx-proxy and acme-companion to set up https certificates automatically using letsencrypt

docker run --detach \
    --name nginx-proxy \
    --publish 80:80 \
    --publish 443:443 \
    --volume certs:/etc/nginx/certs \
    --volume vhost:/etc/nginx/vhost.d \
    --volume html:/usr/share/nginx/html \
    --volume /var/run/docker.sock:/tmp/docker.sock:ro \
    --restart always \
    nginxproxy/nginx-proxy

docker run --detach \
	--name nginx-proxy-acme \
    	--volumes-from nginx-proxy \
    	--volume /var/run/docker.sock:/var/run/docker.sock:ro \
    	--volume acme:/etc/acme.sh \
    	--env "DEFAULT_EMAIL=mail@yourdomain.tld" \
	--restart always \
    	nginxproxy/acme-companion
