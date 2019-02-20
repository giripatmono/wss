FROM scratch
WORKDIR $GOPATH/src/golang-http
ADD . $WORKDIR
EXPOSE 8080
ENTRYPOINT ["/wss"]
COPY ./bin/ /