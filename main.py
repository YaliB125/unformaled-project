from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "yali123")

def verify_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    if x_admin_token != ADMIN_TOKEN:
        print(f"Invalid admin token: {x_admin_token}")
        raise HTTPException(status_code=403, detail="Forbidden: invalid admin token")
    return x_admin_token

class Activity(BaseModel):
    title: str
    category: str
    sub_category: str
    min_age: int
    max_age: int
    content: str  

@app.get("/")
def home():
    return {"message": "UnformalED API is running!"}

@app.get("/activities")
def get_activities(category: Optional[str] = None, sub_category: Optional[str] = None):
    """
    שליפת פעילויות - מאפשר לאתר לסנן לפי 'תיקיות'
    """
    try:
        query = supabase.table("activities").select("*")
        if category:
            query = query.eq("category", category)
        if sub_category:
            query = query.eq("sub_category", sub_category)
        
        response = query.execute()
        return response.data
    except Exception as e:
        print(f"Error fetching activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/activities")
def add_activity(activity: Activity, token: str = Depends(verify_admin_token)):
    """
    הוספת פעילות חדשה
    """
    try:
        print(f"Received activity: {activity}")
        data = activity.dict()
        print(f"Converting to dict: {data}")
        
        response = supabase.table("activities").insert(data).execute()
        print(f"Supabase response: {response.data}")
        
        if response.data:
            return {"success": True, "data": response.data[0]}
        else:
            raise Exception("No data returned from Supabase")
            
    except Exception as e:
        error_msg = str(e)
        print(f"Error adding activity: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to add activity: {error_msg}")


class ForumPost(BaseModel):
    title: str
    category: str
    content: str
    author_name: str


class ForumComment(BaseModel):
    author_name: str
    content: str


@app.get("/forum-posts")
def get_forum_posts(category: Optional[str] = None):
    """Fetch forum posts, optionally filtering by category."""
    try:
        query = supabase.table("forum_posts").select("*").order("created_at", desc=True)
        if category:
            query = query.eq("category", category)

        response = query.execute()
        return response.data
    except Exception as e:
        error_msg = str(e)
        print(f"Error fetching forum posts: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")


@app.post("/forum-posts")
def add_forum_post(post: ForumPost, token: str = Depends(verify_admin_token)):
    """Create a new forum post."""
    try:
        payload = post.dict()
        response = supabase.table("forum_posts").insert(payload).execute()

        if response.data:
            return {"success": True, "data": response.data[0]}

        raise Exception("No data returned from Supabase")
    except Exception as e:
        error_msg = str(e)
        print(f"Error adding forum post: {error_msg}")
        if "relation \"forum_posts\" does not exist" in error_msg.lower():
            raise HTTPException(status_code=500, detail="Supabase table 'forum_posts' not found.")
        raise HTTPException(status_code=500, detail=f"Failed to add forum post: {error_msg}")


@app.get("/forum-posts/{post_id}/comments")
def get_forum_comments(post_id: str):
    """Fetch comments for a specific forum post."""
    try:
        response = supabase.table("forum_comments").select("*").eq("post_id", post_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        error_msg = str(e)
        print(f"Error fetching comments for post_id={post_id}: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Database error: {error_msg}")


@app.post("/forum-posts/{post_id}/comments")
def add_forum_comment(post_id: str, comment: ForumComment, token: str = Depends(verify_admin_token)):
    """Add a comment to a specific forum post."""
    try:
        payload = comment.dict()
        payload["post_id"] = post_id

        response = supabase.table("forum_comments").insert(payload).execute()
        if response.data:
            return {"success": True, "data": response.data[0]}

        raise Exception("No data returned from Supabase")
    except Exception as e:
        error_msg = str(e)
        print(f"Error adding comment for post_id={post_id}: {error_msg}")
        if "relation \"forum_comments\" does not exist" in error_msg.lower():
            raise HTTPException(status_code=500, detail="Supabase table 'forum_comments' not found.")
        raise HTTPException(status_code=500, detail=f"Failed to add comment: {error_msg}")


def extract_magic_paste_fields(raw_text: str) -> dict:
    """Extract Title, Ages, Content and Equipment from a Hebrew Facebook-style post."""
    raw = raw_text.strip()
    lines = [line.strip() for line in raw.splitlines() if line.strip()]

    def clean_text(value: str) -> str:
        if not value:
            return ""
        # Remove emoji and weird social media noise
        value = re.sub(
            r"[\U0001F300-\U0001F5FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U000024C2-\U0001F251]",
            "",
            value,
        )
        value = re.sub(r"\.\.{2,}", ".", value)
        value = re.sub(r"\s+", " ", value)
        value = re.sub(r"[\s\n]*[:\-][\s\n]*$", "", value)
        return value.strip()

    def extract_block(patterns, text):
        pattern = r"(?:{})(?:\s*[:\-]\s*|\s+)(.*?)(?=(?:\n(?:נושא|כותרת|גילאים|גיל|ציוד|חומרים|מהלך|מטרה)\s*[:\-])|\Z)".format("|".join(patterns))
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""

    title = ""
    ages = ""
    equipment = ""
    content = ""

    title = extract_block([r"נושא", r"כותרת"], raw)
    ages = extract_block([r"גילאים", r"גיל"], raw)
    equipment = extract_block([r"ציוד", r"חומרים"], raw)
    content = extract_block([r"מהלך", r"מטרה"], raw)

    if not title and lines:
        title = lines[0]

    if not ages:
        age_fallback = re.search(r"(\d+)\s*[\-–to]?\s*(\d+)?\s*(?:שנים|yrs|years)?", raw)
        if age_fallback:
            if age_fallback.group(2):
                ages = f"{age_fallback.group(1)}-{age_fallback.group(2)}"
            else:
                ages = age_fallback.group(1)

    title = clean_text(title)
    ages = clean_text(ages)
    equipment = clean_text(equipment)
    content = clean_text(content)

    if not content:
        remaining_lines = lines[1:] if title and len(lines) > 1 else lines
        if title and remaining_lines:
            content = " ".join(remaining_lines)
        else:
            content = raw
        content = clean_text(content)

    if not equipment and content:
        # If content begins with ציוד-like fields, push that to equipment if possible
        equipment_keywords = re.search(r"(?:ציוד|חומרים)\s*[:\-]\s*(.+)", raw, re.IGNORECASE)
        if equipment_keywords:
            equipment = clean_text(equipment_keywords.group(1))

    return {
        "title": title,
        "ages": ages,
        "equipment": equipment,
        "content": content,
    }


class MagicPasteInput(BaseModel):
    raw_text: str


class MagicPasteResult(BaseModel):
    title: str
    ages: str
    equipment: str
    content: str


@app.post("/magic-paste", response_model=MagicPasteResult)
def magic_paste_parser(payload: MagicPasteInput):
    """Parse a pasted raw post and return structured form values."""
    try:
        parsed = extract_magic_paste_fields(payload.raw_text)
        return MagicPasteResult(**parsed)
    except Exception as e:
        print(f"Error parsing magic paste: {e}")
        raise HTTPException(status_code=400, detail="Unable to parse the pasted post")