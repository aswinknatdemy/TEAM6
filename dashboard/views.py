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

PASSWORDS = {
    'FTM118': 'Aswink@113',
    'FTM117': 'sinan@tm6',
    'FTM020': 'Pass@Sabitha',
    'FTM138': 'shameel@team6',
    'FTM134': 'nivedhya@tem6',
    'FTM018': 'ashiq@ttm6',
    'FTM014': 'shaniya@tmm6',
    'FTM105': 'anshi@tm6'
}

def get_stats(emp_id):
    login_url = "https://plusthree.natdemy.com/users/login/"
    password = PASSWORDS.get(emp_id)
    if not password:
        return {
            "id": emp_id,
            "name": NAMES.get(emp_id, emp_id),
            "total": 0, "verified": 0, "rejected": 0, "waiting": 0, "error": True
        }
    
    try:
        session = requests.Session()
        # Get login page to get CSRF token
        response = session.get(login_url, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            csrf_input = soup.find('input', {'name': 'csrfmiddlewaretoken'})
            if not csrf_input:
                raise ValueError("CSRF token not found")
            csrf_token = csrf_input['value']
            
            # Login
            login_data = {
                'csrfmiddlewaretoken': csrf_token,
                'employee_id': emp_id,
                'password': password
            }
            headers = {
                'Referer': login_url
            }
            
            post_response = session.post(login_url, data=login_data, headers=headers, timeout=10)
            
            # If successful, we should be on the dashboard page
            dash_soup = BeautifulSoup(post_response.text, 'html.parser')
            
            def find_value(label_text):
                label_p = dash_soup.find('p', string=label_text)
                if label_p:
                    value_p = label_p.find_next_sibling('p', class_='stat-value')
                    if value_p:
                        return int(value_p.text.strip())
                return 0

            total = find_value("Total Registrations")
            verified = find_value("Verified")
            rejected = find_value("Rejected")
            waiting = find_value("Waiting")
            
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
