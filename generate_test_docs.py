import os
import random

desktop_dir = r'C:\Users\naray\Desktop\VerboAI_Test_Docs'
os.makedirs(desktop_dir, exist_ok=True)

# Domain Specific Content Blocks
domains = {
    "HR": [
        "Employee wellness is a top priority. Flexible schedules are advised.",
        "The mandatory 401k matching program vests after three years of continuous employment.",
        "Remote work must be approved 72 hours in advance under section 4B of the handbook.",
        "Annual performance reviews dictate the tier of standard merit bonuses distributed in Q4.",
        "All new hires must complete the 14-day mandatory compliance training via the portal.",
        "Unauthorized overtime is strictly prohibited and violates basic operational budgets.",
        "Maternity leave policies cover up to 16 weeks of fully paid leave across all sectors.",
        "Grievances regarding leadership must follow chain-of-command escalation protocols."
    ],
    "Engineering": [
        "The backend API must validate all JWT tokens before granting access to the SQLAlchemy layer.",
        "Recursive chunking splits text into 500-token logical segments before vector embedding.",
        "PostgreSQL instances deployed on Supabase should maintain strict connection pooling limits.",
        "Zero-trust architecture gates the VPC from external ping sweeps and unauthorized IP blocks.",
        "React frontend utilizes server-side rendering to enhance SEO and reduce client-side delay.",
        "Deduplication is guaranteed via cryptographic SHA-256 hash checks at the upload route.",
        "Docker container orchestration relies on Kubernetes manifests deployed via ArgoCD.",
        "Microservices communicate strictly via secure gRPC channels across internal subnets."
    ],
    "Finance": [
        "Q3 revenue projections indicate a 15% YoY growth due to the newly integrated ad tiers.",
        "Capital expenditure for cloud infrastructure exceeded the forecasted Q1 budget significantly.",
        "The corporate tax compliance report highlights the need for precise VAT tracking in the EU.",
        "Quarterly balance sheets require the CFO's signature before public shareholder release.",
        "Payroll deductions for comprehensive health insurance will increase by 2.4% next fiscal year.",
        "Asset depreciation must be calculated using the straight-line method over a 5-year span.",
        "Foreign exchange risk hedging strategies involve locking long-term forward contracts.",
        "A sudden spike in operational costs correlates directly with rising enterprise SaaS licenses."
    ],
    "Marketing": [
        "The primary demographic for the Q4 ad push comprises young professionals aged 25-34.",
        "Click-through rates (CTR) on the newsletter campaign dipped due to aggressive spam filters.",
        "Social media engagement spikes during early afternoon local times on Tuesdays and Thursdays.",
        "Brand identity guidelines forbid the alteration of the primary vector logo proportions.",
        "Customer retention pipelines require frequent A/B testing on landing page call-to-actions.",
        "Search Engine Optimization requires keyword density optimization over 500-word blog posts.",
        "Influencer outreach programs yielded a lower ROI compared to direct programmatic bidding.",
        "The tone of all public-facing copy should remain accessible, upbeat, and deeply informative."
    ],
    "Legal": [
        "Non-disclosure agreements strictly forbid the dissemination of proprietary architectural code.",
        "Intellectual property rights for any software written on company hardware belongs to the firm.",
        "Termination clauses require a 30-day written notice to avoid breach of contract penalties.",
        "The privacy policy strictly mirrors the European GDPR framework regarding user data erasure.",
        "Arbitration must take place within the state of Delaware in the event of an operational dispute.",
        "Vendors must prove compliance with SOC2 Type II standards before signing final SLA agreements.",
        "Indemnification limits are capped at the total amount paid by the client within the last calendar year.",
        "The Board of Directors holds final veto power regarding unexpected structural acquisitions."
    ]
}

# Explicit contradictions for the anomaly scanner
contradictions = [
    ("HR_Update_2026_Contradiction.txt", "Effective immediately, the mandatory 3-day office rule is completely abolished. The company is transitioning to a 100% remote workforce and all employees may work from home permanently."),
    ("Finance_Budget_Correction.txt", "Disregard previous projections; Q3 revenue actually shrank by 4%, leading to strict hiring freezes across the board."),
    ("Legal_IP_Transfer_Memo.txt", "Intellectual property generated entirely on weekends using personal hardware now belongs to the employee, contradicting prior corporate mandates.")
]

def generate_document(domain, idx, sentences):
    content = f"CONFIDENTIAL DOCUMENT - {domain} DIVISION - RECORD #{idx}\n\n"
    # Select a random number of paragraphs (3 to 6)
    for p in range(random.randint(3, 6)):
        # Construct paragraph heavily weighting the target domain, adding some general filler
        paragraph_sentences = random.sample(sentences[domain], k=random.randint(3, 5))
        content += " ".join(paragraph_sentences) + "\n\n"
        
        content += "Additionally, cross-departmental alignment remains critical. Teams must review quarterly integration milestones to guarantee that strategic operational shifts execute on schedule. Data fidelity and real-time synchronization heavily influence our long-term structural viability.\n\n"
        
    return content


print("Generating 150 synthetic documents across 5 distinct domains...")
file_count = 0
for domain in domains.keys():
    for i in range(1, 31): # 30 files per domain
        filename = f"{domain}_File_{i:03d}.txt"
        with open(os.path.join(desktop_dir, filename), 'w', encoding='utf-8') as f:
            f.write(generate_document(domain, i, domains))
        file_count += 1

# Generate the 3 direct contradictions manually
for filename, text in contradictions:
    with open(os.path.join(desktop_dir, filename), 'w', encoding='utf-8') as f:
        f.write("URGENT MEMO REGARDING POLICY UPDATE\n\n" + text)
    file_count += 1

print(f"Successfully generated {file_count} long-form testing files in {desktop_dir}")
