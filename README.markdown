# docker-zwave-emulator

A docker image based on [py-zwave-emulator](https://github.com/Nico0084/py-zwave-emulator) that allows a fairly quick setup of a Z-Wave Controller emulator.

## Usage

1. Start the emulator

```bash
docker run --rm -ti -p --name=zwave-emulator --publish-all \
docker.pkg.github.com/shnhrrsn/docker-zwave-emulator/emulator:1.0
```

2. Use socat on the host to create tty serial access to the emulator

```bash
socat -d -d pty,link=./ttyVACM0,echo=0,raw,waitslave tcp:localhost:32375
```
