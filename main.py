from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
app = FastAPI()

# חיבור לסופאבייס
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class Activity(BaseModel):
    title: str
    category: str
    sub_category: str
    min_age: int
    max_age: int
    content: str  # כאן נכנס כל התוכן של הפעילות

@app.get("/")
def home():
    return {"message": "UnformalED API is running!"}

@app.get("/activities")
def get_activities(category: Optional[str] = None, sub_category: Optional[str] = None):
    """
    שליפת פעילויות - מאפשר לאתר לסנן לפי 'תיקיות'
    """
    query = supabase.table("activities").select("*")
    if category:
        query = query.eq("category", category)
    if sub_category:
        query = query.eq("sub_category", sub_category)
    
    response = query.execute()
    return response.data

@app.post("/activities")
def add_activity(activity: Activity):
    """
    הוספת פעילות חדשה
    """
    try:
        data = activity.dict()
        response = supabase.table("activities").insert(data).execute()
        return response.data[0]
    except Exception as e:
        return {"error": str(e)}