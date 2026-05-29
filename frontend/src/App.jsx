import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Layout, MessageSquare, Calendar, Sparkles, PlusCircle, ChevronLeft, Search, Printer } from 'lucide-react';

const App = () => {
  const ADMIN_TOKEN_KEY = 'unformalED_admin_token';
  const SECRET_ADMIN_ACCESS = 'yali123';

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [activeTab, setActiveTab] = useState('activities');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAct, setNewAct] = useState({
    title: '',
    category: '',
    sub_category: '',
    min_age: 0,
    max_age: 0,
    content: ''
  });
  const [addError, setAddError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('All');
  const activityCategories = ['All', 'חגים', 'קיץ', 'פעילויות מים', 'פתיחת שנה', 'מחוץ למועדון', 'בתוך המועדון'];

  const [magicText, setMagicText] = useState('');
  const [magicResult, setMagicResult] = useState(null);
  const [magicError, setMagicError] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSuccess, setMagicSuccess] = useState('');
  const [reviewActivity, setReviewActivity] = useState({
    title: '',
    category: '',
    sub_category: '',
    min_age: '',
    max_age: '',
    content: ''
  });

  const [forumPosts, setForumPosts] = useState([]);
  const [forumCategory, setForumCategory] = useState('התייעצות');
  const [selectedForumPost, setSelectedForumPost] = useState(null);
  const [showForumModal, setShowForumModal] = useState(false);
  const [newForumPost, setNewForumPost] = useState({
    title: '',
    category: 'התייעצות',
    content: '',
    author_name: ''
  });
  const [forumComments, setForumComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [forumError, setForumError] = useState('');
  const [forumLoading, setForumLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const forumCategories = ['התייעצות', 'אירוח קבוצות', 'דרושים', 'מפעילים חיצוניים'];

  // משיכת נתונים מהשרת המקומי (Backend)
  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access');
    const validToken = accessToken === SECRET_ADMIN_ACCESS ? accessToken : storedToken === SECRET_ADMIN_ACCESS ? storedToken : '';

    if (validToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, validToken);
      setAdminToken(validToken);
      setIsAdmin(true);
      axios.defaults.headers.common['X-Admin-Token'] = validToken;
      if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      delete axios.defaults.headers.common['X-Admin-Token'];
    }

    fetchActivities();
  }, []);

  useEffect(() => {
    if (activeTab === 'forum') {
      fetchForumPosts(forumCategory);
    }
  }, [activeTab, forumCategory]);

  const fetchActivities = () => {
    axios.get("http://localhost:8000/activities")
      .then(res => {
        console.log("✓ Activities fetched:", res.data);
        setActivities(res.data);
      })
      .catch(err => {
        console.error("✗ Error fetching activities:", err.response?.data || err.message);
      });
  };

  const fetchForumPosts = (category) => {
    setForumLoading(true);
    setForumError('');
    axios.get('http://localhost:8000/forum-posts', {
      params: { category }
    })
      .then(res => {
        console.log('✓ Forum posts fetched:', res.data);
        setForumPosts(res.data);
      })
      .catch(err => {
        console.error('✗ Error fetching forum posts:', err.response?.data || err.message);
        setForumError('Error loading forum posts.');
      })
      .finally(() => setForumLoading(false));
  };

  const fetchForumComments = (postId) => {
    setCommentLoading(true);
    setForumError('');
    axios.get(`http://localhost:8000/forum-posts/${postId}/comments`)
      .then(res => {
        console.log('✓ Forum comments fetched:', res.data);
        setForumComments(res.data);
      })
      .catch(err => {
        console.error('✗ Error fetching comments:', err.response?.data || err.message);
        setForumError('Error loading comments.');
      })
      .finally(() => setCommentLoading(false));
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAddError('');

    console.log("📤 Sending activity:", newAct);

    try {
      // Ensure numeric fields are numbers, not strings
      const payload = {
        ...newAct,
        min_age: parseInt(newAct.min_age, 10),
        max_age: parseInt(newAct.max_age, 10)
      };

      console.log("📝 Payload after conversion:", payload);

      const response = await axios.post("http://localhost:8000/activities", payload);
      
      console.log("✓ Activity added successfully:", response.data);
      
      // Reset form and refresh list
      setNewAct({
        title: '',
        category: '',
        sub_category: '',
        min_age: 0,
        max_age: 0,
        content: ''
      });
      setShowAddForm(false);
      fetchActivities();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      console.error("✗ Error adding activity:", err.response?.status, errorMsg);
      setAddError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const parseAges = (agesString) => {
    if (!agesString) return { min_age: '', max_age: '' };
    const rangeMatch = agesString.match(/(\d+)\s*[\-–to]+\s*(\d+)/);
    if (rangeMatch) {
      return { min_age: rangeMatch[1], max_age: rangeMatch[2] };
    }
    const plusMatch = agesString.match(/(\d+)\+?/);
    if (plusMatch) {
      return { min_age: plusMatch[1], max_age: plusMatch[1] };
    }
    return { min_age: '', max_age: '' };
  };

  const filteredActivities = activities.filter((act) => {
    const query = activitySearch.trim().toLowerCase();
    const matchesSearch = !query || [act.title, act.content, act.sub_category]
      .some(field => field?.toLowerCase().includes(query));
    const matchesCategory = activityCategoryFilter === 'All' || act.category === activityCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleParseMagicPaste = async (e) => {
    e.preventDefault();
    setMagicError('');
    setMagicLoading(true);
    setMagicResult(null);
    setMagicSuccess('');

    try {
      const response = await axios.post('http://localhost:8000/magic-paste', {
        raw_text: magicText
      });

      const { title, ages, equipment } = response.data;
      const { min_age, max_age } = parseAges(ages);

      setMagicResult(response.data);
      setReviewActivity({
        title: title || '',
        category: '',
        sub_category: '',
        min_age,
        max_age,
        content: equipment || ''
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      console.error('✗ Magic paste error:', errorMsg);
      setMagicError(`לא הצליח לנתח את הטקסט: ${errorMsg}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleReviewChange = (field, value) => {
    setReviewActivity(prev => ({ ...prev, [field]: value }));
  };

  const handleApproveSave = async () => {
    setMagicLoading(true);
    setMagicError('');
    setMagicSuccess('');

    if (!reviewActivity.category || !reviewActivity.sub_category) {
      setMagicError('יש להזין קטגוריה ותת-קטגוריה לפני שמירת הפעילות.');
      setMagicLoading(false);
      return;
    }

    try {
      const payload = {
        ...reviewActivity,
        min_age: parseInt(reviewActivity.min_age, 10) || 0,
        max_age: parseInt(reviewActivity.max_age, 10) || 0
      };

      const response = await axios.post('http://localhost:8000/activities', payload);
      console.log('✓ Admin saved activity:', response.data);

      setMagicSuccess('הפעילות נשמרה בהצלחה למסד הנתונים.');
      setMagicText('');
      setMagicResult(null);
      setReviewActivity({ title: '', category: '', sub_category: '', min_age: '', max_age: '', content: '' });
      fetchActivities();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      console.error('✗ Approve & Save error:', errorMsg);
      setMagicError(`שגיאה בשמירה: ${errorMsg}`);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleCreateForumPost = async (e) => {
    e.preventDefault();
    setForumError('');
    setForumLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/forum-posts', newForumPost);
      console.log('✓ Forum post created:', response.data);
      setShowForumModal(false);
      setNewForumPost({ title: '', category: forumCategory, content: '', author_name: '' });
      fetchForumPosts(forumCategory);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      console.error('✗ Error creating forum post:', errorMsg);
      setForumError('Error saving the post.');
    } finally {
      setForumLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedForumPost) {
      return;
    }
    setCommentLoading(true);
    setForumError('');

    try {
      const response = await axios.post(`http://localhost:8000/forum-posts/${selectedForumPost.id}/comments`, {
        author_name: 'anonymous',
        content: commentText
      });
      console.log('✓ Comment added:', response.data);
      setCommentText('');
      fetchForumComments(selectedForumPost.id);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      console.error('✗ Error adding comment:', errorMsg);
      setForumError('Error saving the comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  // רכיב כפתור בתפריט הצד
  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => { setActiveTab(id); setSelectedActivity(null); }}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
        activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-blue-50'
      }`}
    >
      <Icon size={22} />
      <span className="font-bold text-lg">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" dir="rtl">
      
      {/* תפריט צד (Sidebar) */}
      <aside className="w-72 bg-white p-8 border-l border-slate-100 flex flex-col h-screen sticky top-0 shadow-sm">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">U</div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">unformalED</h1>
        </div>

        <nav className="space-y-3 flex-1">
          <SidebarItem id="activities" icon={Layout} label="פעילויות" />
          {isAdmin && <SidebarItem id="admin" icon={Search} label="Admin Dashboard" />}
          <SidebarItem id="forum" icon={MessageSquare} label="פורום קהילתי" />
          <SidebarItem id="planner" icon={Calendar} label="לוח חודשי" />
          <SidebarItem id="ai" icon={Sparkles} label="מחולל AI" />
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-50">
          <p className="text-xs text-slate-400 font-medium">גרסה 1.0 - שלב ה-MVP</p>
        </div>
      </aside>

      {/* תוכן מרכזי */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        
        {/* טופס הוספת פעילות */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleAddActivity} className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-3xl font-black text-slate-900 mb-6">הוספת פעילות חדשה</h3>
              
              {addError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                  {addError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="שם הפעילות"
                  value={newAct.title}
                  onChange={(e) => setNewAct({...newAct, title: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right"
                  required
                />

                <select
                  value={newAct.category}
                  onChange={(e) => setNewAct({...newAct, category: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">בחר קטגוריה</option>
                  <option value="חגים">חגים</option>
                  <option value="פתיחת שנה">פתיחת שנה</option>
                  <option value="קיץ">קיץ</option>
                  <option value="פעילויות מים">פעילויות מים</option>
                  <option value="מחוץ למועדון">מחוץ למועדון</option>
                  <option value="בתוך המועדון">בתוך המועדון</option>
                </select>

                <input
                  type="text"
                  placeholder="תת-קטגוריה"
                  value={newAct.sub_category}
                  onChange={(e) => setNewAct({...newAct, sub_category: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="גיל מינימום"
                    value={newAct.min_age}
                    onChange={(e) => setNewAct({...newAct, min_age: e.target.value})}
                    className="px-4 py-3 border border-slate-200 rounded-xl text-right"
                    required
                  />
                  <input
                    type="number"
                    placeholder="גיל מקסימום"
                    value={newAct.max_age}
                    onChange={(e) => setNewAct({...newAct, max_age: e.target.value})}
                    className="px-4 py-3 border border-slate-200 rounded-xl text-right"
                    required
                  />
                </div>

                <textarea
                  placeholder="תוכן הפעילות"
                  value={newAct.content}
                  onChange={(e) => setNewAct({...newAct, content: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-right h-32"
                  required
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "שומר..." : "שמור פעילות"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 transition-all"
                >
                  בטל
                </button>
              </div>
            </form>
          </div>
        )}

        
        <header className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-black text-slate-900">
            {activeTab === 'activities' && 'מאגר פעילויות'}
            {activeTab === 'admin' && 'Admin Dashboard'}
            {activeTab === 'forum' && 'הפורום שלנו'}
            {activeTab === 'planner' && 'לוח חודשי'}
            {activeTab === 'ai' && 'מחולל AI (בקרוב)'}
          </h2>
          {activeTab === 'activities' && isAdmin && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all font-bold">
              <PlusCircle size={20} />
              <span>הוספה מהירה</span>
            </button>
          )}
        </header>

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex flex-col gap-3 mb-4">
                <span className="text-sm text-slate-500">Admin only</span>
                <h3 className="text-3xl font-black text-slate-900">Magic Paste</h3>
                <p className="text-slate-500 leading-relaxed">
                  הדבק כאן פוסט גולמי מפייסבוק. לאחר הניתוח תוכל לעבור על השדות, לתקן טעויות ואז לאשר ולשמור.
                </p>
              </div>

              <textarea
                value={magicText}
                onChange={(e) => setMagicText(e.target.value)}
                placeholder="הדבק כאן פוסט מפייסבוק..."
                className="w-full px-4 py-4 border border-slate-200 rounded-[1.5rem] text-right min-h-[220px]"
              />

              {magicError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                  {magicError}
                </div>
              )}

              <button
                onClick={handleParseMagicPaste}
                disabled={magicLoading || !magicText.trim()}
                className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {magicLoading ? 'מנתח...' : 'נתח פוסט'}
              </button>
            </section>

            {magicResult && (
              <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-col gap-3 mb-6">
                  <h3 className="text-3xl font-black text-slate-900">Review parsed activity</h3>
                  <p className="text-slate-500 leading-relaxed">
                    השדות נשלפו אוטומטית. עדכן קטגוריה, גילאים ותוכן לפני השמירה כדי לוודא שהפעילות נכנסת נכון.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-slate-700 font-semibold">שם הפעילות</span>
                    <input
                      value={reviewActivity.title}
                      onChange={(e) => handleReviewChange('title', e.target.value)}
                      className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-700 font-semibold">קטגוריה</span>
                    <input
                      value={reviewActivity.category}
                      onChange={(e) => handleReviewChange('category', e.target.value)}
                      className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                      placeholder="בחר או כתוב קטגוריה"
                    />
                  </label>

                  <label className="block">
                    <span className="text-slate-700 font-semibold">תת-קטגוריה</span>
                    <input
                      value={reviewActivity.sub_category}
                      onChange={(e) => handleReviewChange('sub_category', e.target.value)}
                      className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                      placeholder="תת-קטגוריה"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-slate-700 font-semibold">גיל מינימום</span>
                      <input
                        type="number"
                        value={reviewActivity.min_age}
                        onChange={(e) => handleReviewChange('min_age', e.target.value)}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                        placeholder="גיל מינימום"
                      />
                    </label>
                    <label className="block">
                      <span className="text-slate-700 font-semibold">גיל מקסימום</span>
                      <input
                        type="number"
                        value={reviewActivity.max_age}
                        onChange={(e) => handleReviewChange('max_age', e.target.value)}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                        placeholder="גיל מקסימום"
                      />
                    </label>
                  </div>

                  <label className="md:col-span-2 block">
                    <span className="text-slate-700 font-semibold">ציוד / חומרים</span>
                    <textarea
                      value={reviewActivity.content}
                      onChange={(e) => handleReviewChange('content', e.target.value)}
                      className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right min-h-[140px]"
                    />
                  </label>
                </div>

                <div className="mt-8 flex flex-col gap-4 md:flex-row">
                  <button
                    onClick={handleApproveSave}
                    disabled={magicLoading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {magicLoading ? 'שומר...' : 'אשר ושמור למסד הנתונים'}
                  </button>
                  {magicSuccess && (
                    <div className="flex-1 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 font-semibold">
                      {magicSuccess}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'forum' && (
          <div className="space-y-8">
            {showForumModal && (
              <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                <form onSubmit={handleCreateForumPost} className="bg-white rounded-[2rem] p-8 w-full max-w-3xl shadow-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-3xl font-black text-slate-900">צור פוסט חדש</h3>
                    <button type="button" onClick={() => setShowForumModal(false)} className="text-slate-500 hover:text-slate-900">ביטול</button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-slate-700 font-semibold">כותרת</span>
                      <input
                        value={newForumPost.title}
                        onChange={(e) => setNewForumPost(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-slate-700 font-semibold">קטגוריה</span>
                      <select
                        value={newForumPost.category}
                        onChange={(e) => setNewForumPost(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right bg-white"
                      >
                        {forumCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-slate-700 font-semibold">שם המחבר</span>
                      <input
                        value={newForumPost.author_name}
                        onChange={(e) => setNewForumPost(prev => ({ ...prev, author_name: e.target.value }))}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right"
                        placeholder="למשל: יוסי מנהל קהילה"
                        required
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-slate-700 font-semibold">תוכן הפוסט</span>
                      <textarea
                        value={newForumPost.content}
                        onChange={(e) => setNewForumPost(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right min-h-[160px]"
                        required
                      />
                    </label>
                  </div>

                  {forumError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                      {forumError}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <button
                      type="submit"
                      disabled={forumLoading}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {forumLoading ? 'שומר פוסט...' : 'פרסם פוסט'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForumModal(false)}
                      className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-[#FEFBEC] p-6 rounded-[2rem] shadow-sm border border-amber-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="text-sm text-amber-600 uppercase font-bold tracking-wide">פורום קהילתי</span>
                  <h3 className="mt-3 text-3xl font-black text-slate-900">דיונים, אירוח, דרושים ומפעילים חיצוניים</h3>
                </div>
                <button
                  onClick={() => setShowForumModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all"
                >
                  צור פוסט חדש
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {forumCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setForumCategory(cat); setSelectedForumPost(null); }}
                  className={`px-4 py-2 rounded-full font-semibold transition-all ${forumCategory === cat ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {forumError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                {forumError}
              </div>
            )}

            {selectedForumPost ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <button
                  onClick={() => { setSelectedForumPost(null); setForumComments([]); }}
                  className="text-blue-600 font-bold mb-6"
                >
                  חזרה לרשימת הפוסטים
                </button>
                <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                  {selectedForumPost.category}
                </span>
                <h3 className="text-4xl font-black text-slate-900 mb-3">{selectedForumPost.title}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-500 mb-6">
                  <span>מאת: {selectedForumPost.author_name}</span>
                  <span>נוצר על ידי  כרגע</span>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-8">
                  {selectedForumPost.content}
                </div>

                <div className="space-y-4">
                  <h4 className="text-2xl font-bold text-slate-900">תגובות</h4>
                  {commentLoading && (
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-500">טוען תגובות...</div>
                  )}
                  {forumComments.length === 0 && !commentLoading ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-500">אין עדיין תגובות. תהיה הראשון להגיב.</div>
                  ) : (
                    forumComments.map(comment => (
                      <div key={comment.id || comment.content} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between gap-3 mb-2 text-slate-600 text-sm">
                          <span>{comment.author_name || 'אורח'}</span>
                          <span>{comment.created_at ? new Date(comment.created_at).toLocaleString('he-IL') : ''}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}

                  <form onSubmit={handleAddComment} className="space-y-4">
                    <label className="block">
                      <span className="text-slate-700 font-semibold">הוספת תגובה</span>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl text-right min-h-[120px]"
                        placeholder="כתוב תגובה..."
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={commentLoading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {commentLoading ? 'שולח...' : 'פרסם תגובה'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {forumLoading ? (
                  <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-slate-500">טוען פוסטים...</div>
                ) : forumPosts.length === 0 ? (
                  <div className="p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-slate-500">
                    אין פוסטים בקטגוריה זו. צור פוסט חדש כדי להתחיל.
                  </div>
                ) : (
                  forumPosts.map(post => (
                    <button
                      type="button"
                      key={post.id}
                      onClick={() => { setSelectedForumPost(post); fetchForumComments(post.id); }}
                      className={`text-left w-full rounded-[2rem] p-6 shadow-sm border transition-all hover:shadow-xl ${post.category === 'מפעילים חיצוניים' ? 'bg-[#EFF8FF] border-blue-100' : 'bg-white border-slate-100'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <span className="text-slate-500 text-sm">{post.author_name}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">{post.category}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 mb-3">{post.title}</h4>
                      <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">{post.content}</p>
                      {post.category === 'מפעילים חיצוניים' && (
                        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-slate-700">
                          <p className="font-semibold mb-2">מפעיל חיצוני</p>
                          <p className="text-sm leading-relaxed">צרו קשר: {post.author_name}</p>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* תצוגת פעילויות - רשימה */}
        {activeTab === 'activities' && !selectedActivity && (
          <>
            <section className="mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="חיפוש פעילויות לפי כותרת, תוכן או תת-קטגוריה..."
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {activityCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActivityCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-full font-semibold transition-all ${activityCategoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {cat === 'All' ? 'כל הקטגוריות' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.length > 0 ? (
                filteredActivities.map(act => (
                  <div key={act.id} onClick={() => setSelectedActivity(act)}
                       className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{act.category}</span>
                      <ChevronLeft className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{act.title}</h3>
                    <p className="text-slate-500 text-sm mb-4">{act.sub_category}</p>
                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-slate-400 text-sm">
                      <span className="font-medium">גיל: {act.min_age}-{act.max_age}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-24 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
                  <p className="text-slate-400 text-xl font-bold">לא נמצאו פעילויות מתאימות, נסי מילת מפתח אחרת</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* תצוגת פעילות בודדת (כשלוחצים על קוביה) */}
        {activeTab === 'activities' && selectedActivity && (
          <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-4xl mx-auto relative">
            <div className="flex justify-between items-start mb-8">
              <button onClick={() => setSelectedActivity(null)} className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                חזרה למאגר <ChevronLeft className="rotate-180" />
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all font-bold"
              >
                <Printer size={20} />
                <span>הדפס</span>
              </button>
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-6 leading-tight">{selectedActivity.title}</h2>
            <div className="flex gap-3 mb-10">
              <span className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold">{selectedActivity.category}</span>
              <span className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl font-bold">גילאים: {selectedActivity.min_age}-{selectedActivity.max_age}</span>
            </div>
            <div className="bg-slate-50 p-8 rounded-[2rem] text-slate-700 text-xl leading-relaxed whitespace-pre-wrap">
              {selectedActivity.content}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;