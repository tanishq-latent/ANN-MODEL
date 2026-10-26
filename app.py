import streamlit as st
import pandas as pd
import numpy as np
import pickle
from tensorflow.keras.models import load_model
model = load_model("laptop_price_model.keras")
# ----------------------------------
# Load model and metadata
# ----------------------------------


with open("model_columns.pkl", "rb") as f:
    model_columns = pickle.load(f)

with open("dropdowns.pkl", "rb") as f:
    dropdowns = pickle.load(f)

# ----------------------------------
# Streamlit UI
# ----------------------------------
st.set_page_config(
    page_title="Laptop Price Predictor",
    page_icon="💻",
    layout="centered"
)

st.title("💻 Laptop Price Prediction")
st.write("Enter laptop specifications to estimate its price.")

# ----------------------------------
# User Inputs
# ----------------------------------
st.subheader("🔧 Laptop Specifications")

col1, col2 = st.columns(2)

with col1:
    company = st.selectbox("Brand", dropdowns["Company"])
    type_name = st.selectbox("Laptop Type", dropdowns["TypeName"])
    cpu = st.selectbox("CPU Brand", dropdowns["Cpu_brand"])
    gpu = st.selectbox("GPU Brand", dropdowns["Gpu_brand"])
    os = st.selectbox("Operating System", dropdowns["OpSys"])

with col2:
    ram = st.selectbox("RAM (GB)", dropdowns["Ram"])
    inches = st.number_input("Screen Size (Inches)", 10.0, 20.0, step=0.1)
    ssd = st.number_input("SSD (GB)", 0, 2000, step=128)
    hdd = st.number_input("HDD (GB)", 0, 2000, step=256)
    weight = st.number_input("Weight (kg)", 0.5, 5.0, step=0.1)

# ----------------------------------
# Predict Button
# ----------------------------------
if st.button("🔮 Predict Price"):
    # Create single-row dataframe
    input_data = {
        "Company": company,
        "TypeName": type_name,
        "Cpu_brand": cpu,
        "Gpu_brand": gpu,
        "OpSys": os,
        "Ram": ram,
        "Inches": inches,
        "SSD": ssd,
        "HDD": hdd,
        "Weight": weight
    }

    input_df = pd.DataFrame([input_data])

    # One-hot encode
    encoded_df = pd.get_dummies(input_df)

    # Align columns with training data
    encoded_df = encoded_df.reindex(columns=model_columns, fill_value=0)

    # Prediction
    prediction = model.predict(encoded_df)[0][0]

    st.success(f"💰 Estimated Laptop Price: ₹{int(prediction):,}")

    st.caption("⚠️ Prediction is based on historical data and may vary.")

# ----------------------------------
# Footer
# ----------------------------------
st.markdown("---")
st.markdown("Built with ❤️ using Machine Learning")
