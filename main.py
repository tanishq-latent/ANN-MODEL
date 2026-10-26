# Imports
from contextlib import asynccontextmanager
from tensorflow.keras.models import load_model
from sklearn.preprocessing import StandardScaler
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import pickle

# Number and text columns
number_columns = ['Inches', 'Ram', 'Weight']
text_columns = ["Company", "TypeName", "ScreenResolution", "Cpu", "Memory", "Gpu", "OpSys"]


# Empty ml box
ml = {}

# STEP 1: Lifespan
@asynccontextmanager
async def lifespan(app):
    #   Load model
    ml["model"] = load_model("laptop_price_model.keras")

    #   Load columns
    with open("model_columns.pkl", "rb") as file:
        ml["columns"] = pickle.load(file)

    #   Read and clean CSV
    df = pd.read_csv("laptop_price.csv", encoding="latin")
    df['Ram'] = df['Ram'].str.replace('GB', '').astype(int)
    df['Weight'] = df['Weight'].str.replace('kg', '').astype(float)


    #   Fit scaler
    scaler = StandardScaler()
    scaler.fit(df[number_columns])
    ml["scaler"] = scaler

    #   Build allowed values
    allowed = {}
    for i in text_columns:
        allowed[i] = set(df[i])
    ml["allowed"] = allowed

    #   yield
    yield

    #   Clear ml
    ml.clear()

# Create app
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# STEP 2: Schemas
    #   Input class
class LaptopInput(BaseModel):   #PYDANTIC MODEL
    Company             : str   = Field(examples=["Apple"])
    TypeName            : str   = Field(examples=["Ultrabook"])
    Inches              : float = Field(examples=[13.3])
    ScreenResolution    : str   = Field(examples=["IPS Panel Retina Display 2560x1600"])
    Cpu                 : str   = Field(examples=["Intel Core i5 2.3GHz"])
    Ram                 : int   = Field(examples=[8])
    Memory              : str   = Field(examples=["128GB SSD"])
    Gpu                 : str   = Field(examples=["Intel Iris Plus Graphics 640"])
    OpSys               : str   = Field(examples=["macOS"])
    Weight              : float = Field(examples=[1.37])


#   Output class
class LaptopOutput(BaseModel):
    price_euros : float

# STEP 3: Prepare input
def prepare_input(laptop):
    #   Make one-row table
    df = pd.DataFrame([laptop.model_dump()])

    #   Scale numbers
    df[number_columns] = ml["scaler"].transform(df[number_columns])

    #   One-hot encode text
    df = pd.get_dummies(df, columns=text_columns)

    #   Reindex columns
    df = df.reindex(columns = ml["columns"], fill_value=0)

    #   Return float32
    return df.astype("float32")


# STEP 4: /predict endpoint
@app.post('/predict', response_model=LaptopOutput)
def predict(laptop : LaptopInput):

    #   Check allowed values
    for i in text_columns:
        value = getattr(laptop, i) #laptop.Company = YOLO?c value=YOLO
        if value not in ml["allowed"][i]:
            raise HTTPException(status_code=400, detail=f"Unkown {i} : {value}")    

    #   Prepare input
    data = prepare_input(laptop)

    #   Call model
    result = ml["model"](data.to_numpy(), training=False)

    #   Get price
    price = float(result[0][0])#[[output]]

    #   Return price
    return LaptopOutput(price_euros=round(price, 2))

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")