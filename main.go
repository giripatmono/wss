package main

import (
	"flag"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"os"
)

var addr = flag.String("addr", ":8080", "http service address")

// Configure the upgrader
var upgrader = websocket.Upgrader{}

// Define our query object
type Query struct {
	Model string `json:"model"`
}

type Message struct {
	Date float64 `json:"date"`
	Text string  `json:"text"`
}

type Messages struct {
	MessageList []Message `json:"messages"`
}

func main() {

	ParseEnvironment()

	// Create a simple file server
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	// Configure websocket route
	http.HandleFunc("/ws", handleWSConnections)

	var httpErr error
	if _, err := os.Stat("./server.crt"); err == nil {
		fmt.Println("Serving https...")
		if httpErr = http.ListenAndServeTLS(*addr, "server.crt", "server.key", nil); httpErr != nil {
			log.Fatal("The process exited with https error: ", httpErr.Error())
		}
	} else {
		fmt.Println("Serving http...")
		httpErr = http.ListenAndServe(*addr, nil)
		if httpErr != nil {
			log.Fatal("The process exited with http error: ", httpErr.Error())
		}
	}

}

func isAuthenticated(token *string) bool {
	fmt.Println("authenticating...")
	fmt.Println(*token)
	//bearerToken := *token

	//tv := map[string]string{}
	//tv["aud"] = "api://default"
	//tv["cid"] = os.Getenv("SPA_CLIENT_ID")
	//jv := verifier.JwtVerifier{
	//	Issuer:           os.Getenv("ISSUER"),
	//	ClaimsToValidate: tv,
	//}
	//
	//a, err := jv.New().VerifyAccessToken(bearerToken)
	//
	//fmt.Println("isAuth...")
	//fmt.Println(a)
	//fmt.Println(err)
	//if err != nil {
	//	return false
	//}

	return true
}

func handleWSConnections(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handle new connection...")
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Headers", "Content-Type, authorization")
	w.Header().Add("Access-Control-Allow-Methods", "GET, OPTIONS")

	if r.Method == "OPTIONS" {
		return
	}

	tokenCookie, err := r.Cookie("token")
	if err != nil {
		w.Write([]byte("error in reading cookie : " + err.Error() + "\n"))
		return
	} else {
		fmt.Println("token:", tokenCookie)
	}
	//token, _ := r.URL.Query()["token"]

	if !isAuthenticated(&tokenCookie.Value) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("401 - You are not authorized for this request"))
		return
	}

	var forever = make(chan bool)

	// channel for query
	var queryChan = make(chan Query, 10)

	// Upgrade initial GET request to a websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}

	// Make sure we close the connection when the function returns
	defer ws.Close()

	// Get Message from client
	go func() {
		for {
			var qry Query
			// Read in a new message as JSON and map it to a Query object
			err := ws.ReadJSON(&qry)
			fmt.Println("new query", qry, ws.LocalAddr(), ws.RemoteAddr())
			if err != nil {
				log.Printf("error: %v", err)
				break
			}

			// Send the newly received message to the broadcast channel
			queryChan <- qry

		}
	}()

	// Process Message & Send Response
	go func() {
		for qry := range queryChan {
			fmt.Println("query message: ", qry)
			var err error
			switch qry.Model {
			case "sales":
				err = ws.WriteJSON("data sales")
			case "promo":
				err = ws.WriteJSON("data promo")
			default:
				err = ws.WriteJSON("not found")
			}
			if err != nil {
				log.Printf("error: %v", err)
				ws.Close()
			}
		}
	}()

	<-forever
}
