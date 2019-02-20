FROM scratch
EXPOSE 8080
ENTRYPOINT ["/wss"]
COPY ./bin/ /