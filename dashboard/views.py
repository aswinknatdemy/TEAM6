from django.shortcuts import render
from django.http import JsonResponse
import requests
from bs4 import BeautifulSoup

EMPLOYEE_IDS = ['FTM118', 'FTM117', 'FTM020', 'FTM138', 'FTM134', 'FTM018', 'FTM014', 'FTM105']
NAMES = {
    'FTM118': 'ASWIN',
    'FTM117': 'SINAN',
    'FTM020': 'SABITHA',
    'FTM138': 'SHAMEEL',
    'FTM134': 'NIVEDHYA',
    'FTM018': 'ASHIQ',
    'FTM014': 'SHANIYA',
    'FTM105': 'ANSHID'
}

def get_stats(emp_id):
    url = f"https://plusthree.natdemy.com/users/dashboard/?referral={emp_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            def find_value(label_text):
                label_div = soup.find('div', string=label_text)
                if label_div:
                    value_div = label_div.find_next_sibling('div', class_='value')
                    if value_div:
                        return int(value_div.text.strip())
                return 0

            total = find_value("All Registered Members")
            verified = find_value("Verified Members")
            rejected = find_value("Rejected Members")
            waiting = total - verified - rejected
            
            return {
                "id": emp_id,
                "name": NAMES.get(emp_id, emp_id),
                "total": total,
                "verified": verified,
                "rejected": rejected,
                "waiting": waiting
            }
    except Exception as e:
        print(f"Error fetching data for {emp_id}: {e}")
    
    return {
        "id": emp_id,
        "name": NAMES.get(emp_id, emp_id),
        "total": 0,
        "verified": 0,
        "rejected": 0,
        "waiting": 0,
        "error": True
    }

def index(request):
    return render(request, 'index.html')

def api_stats(request):
    results = []
    for emp_id in EMPLOYEE_IDS:
        results.append(get_stats(emp_id))
    
    # Sort by total registrations descending
    results.sort(key=lambda x: x['total'], reverse=True)
    return JsonResponse(results, safe=False)
