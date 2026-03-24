A web application to import, visualize, and navigate to traffic stations from the PeMSD7 dataset.
Each station is displayed on an interactive map; a single click gives you a Waze deep link to start navigation directly to that station.
✨ Features
📥 CSV import – load PeMSD7_M_Station_Info.csv into MongoDB.

📊 Dashboard – see number of stations, columns, and a preview of the first records.

🗺️ Interactive map – built with Leaflet (OpenStreetMap base layer).

🚗 Waze integration – each station popup contains a link to launch Waze with that location as destination.

📡 REST API – expose station data at /api/stations.

🐳 Dockerized – easy start with docker-compose.

🛠️ Tech Stack
Layer	Technology
Backend	Node.js, Express
Database	MongoDB (official driver)
Frontend	HTML5, CSS3, Vanilla JavaScript
Mapping	Leaflet + OpenStreetMap tiles
CSV parsing	csv-parser
DevOps	Docker, Docker Compose


.
├── backend/
│   ├── app.js               # main Express server
│   ├── package.json         # dependencies
│   ├── html/                # HTML templates
│   │   ├── layout.html
│   │   ├── home.html
│   │   ├── import.html
│   │   └── map.html
│   └── style.css            # global stylesheet
├── Dockerfile                # builds the Node.js image
├── dataset/                  # place PeMSD7_M_Station_Info.csv here
├── docker-compose.yml        # orchestrates web + mongodb services
└── README.md                 # you are here



Commands :
1-docker compose down.
2-docker-compose up --build.