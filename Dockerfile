FROM python:2.7.17-alpine3.11 as build

# Build deps
RUN apk --no-cache add \
	git \
	build-base \
	linux-headers \
	openzwave \
	bash \
	curl

# Install zwemulator
RUN pip install 'Flask>=0.10.1' 'Flask-Login>=0.2.11' 'pyserial>=2.6' 'psutil'
RUN git clone https://github.com/Nico0084/py-zwave-emulator.git /build/emulator \
	&& chmod +x /build/emulator/bin/zwemulator.py

# Update OZW DB
RUN git clone https://github.com/OpenZWave/open-zwave /tmp/ozw
RUN cd /tmp/ozw \
	&& rm -fr /build/emulator/openzwave/config \
	&& mv /tmp/ozw/config /build/emulator/openzwave/config

# Copy over local data
RUN rm -fr /build/emulator/data
COPY data /build/emulator/data
COPY services /build/etc/services.d

# Move site-packages into /build
RUN mkdir -p /build/usr/lib/python2.7 \
	&& mv /usr/local/lib/python2.7/site-packages /build/usr/lib/python2.7

# Download s6-overlay
RUN curl --fail --silent -L https://github.com/just-containers/s6-overlay/releases/download/v1.21.8.0/s6-overlay-amd64.tar.gz \
	| tar xzvf - -C /build

# Build final image
FROM alpine:3.11
RUN apk --no-cache add bash socat python2
COPY --from=build /build /
ENTRYPOINT [ "/init" ]
EXPOSE 4500
EXPOSE 32375
