FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .


RUN CGO_ENABLED=0 GOOS=linux go build -o /ipcheck

FROM scratch

COPY --from=builder /ipcheck /ipcheck

EXPOSE 27654

WORKDIR /

ENTRYPOINT ["/ipcheck"]
