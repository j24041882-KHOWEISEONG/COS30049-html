# Malaysia Vehicle Count Prediction 

The is the website for assignment 3 of COS30049 Computing Technology Innovation Project. The application allows users to enter the population of people above 15 and national mean income, to predict the number and types of vehicles in Malaysia. We are group 12. 

## Setup in VS Code (Windows)

Open the repository. The React app is in `frontend` folder and the API server and AI model is in `backend` folder.

In the terminal, please navigate to the `frontend` folder and run the following command:

```powershell
npm install
```
Note that Node.js must be installed in the system first before running this command. 

Then, please navigate to `backend` folder to run the following command:

```powershell
pip install -r requirements.txt
```

Running these two commands will ensure the required libraries are installed in your system so the application is able to run smoothly.

## Running the application in VS Code (Windows)

In the terminal, please navigate to `backend` folder to run the following command:

```powershell
python main.py
```

Then, please navigate to the `frontend` folder and run the following command:

```powershell
npm start
```
The React application should successfully open at http://localhost:3000. 

## Using the application

The opened page at http://localhost:3000 should display the homepage, which shows some charts displaying some statistics on existing vehicle registration records in Malaysia. Navigate to the prediction page and enter input values for population of people above 15 and national mean income, and click the predict button for the application to generate and display predictions. Use the filters to control what the charts displays. The charts are interactive and users can hover over to show tooltips. Users can also click on the enlarge or table button at the top right hand corner of every chart to view a bigger chart, or view the information in text format.

