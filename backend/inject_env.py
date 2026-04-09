import boto3
import os

def inject_env():
    print("🚀 Starting ECS Environment Injection (Python Edition)...")
    
    # 1. Load .env
    env_vars = []
    env_path = '.env'
    if not os.path.exists(env_path):
        print(f"❌ Error: {env_path} not found.")
        return

    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            name, value = line.split('=', 1)
            env_vars.append({'name': name.strip(), 'value': value.strip()})
    
    print(f"✅ Parsed {len(env_vars)} variables from .env.")

    # 2. Setup Client
    # We assume credentials are in the environment (AWS CLI is configured)
    ecs = boto3.client('ecs', region_name='us-east-2')
    
    # 3. Get latest Task Definition
    task_family = 'justateit-backend-task'
    describe_res = ecs.describe_task_definition(taskDefinition=task_family)
    task_def = describe_res['taskDefinition']
    
    # 4. Update Container Definitions (Environment + Logging)
    containers = task_def['containerDefinitions']
    for c in containers:
        # Inject Environment Variables
        c['environment'] = env_vars
        
        # Inject Universal Logging to ensure we aren't "blind" to crashes
        c['logConfiguration'] = {
            'logDriver': 'awslogs',
            'options': {
                'awslogs-group': '/ecs/justateit-backend-task',
                'awslogs-region': 'us-east-2',
                'awslogs-stream-prefix': 'ecs',
                'awslogs-create-group': 'true'
            }
        }
        print(f"   -> Injected keys and logs into: {c['name']}")

    # 5. Register new revision
    # We must strip off forbidden keys returned by describe-task-definition
    forbidden = [
        'taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 
        'compatibilities', 'registeredAt', 'registeredBy'
    ]
    new_def_args = {k: v for k, v in task_def.items() if k not in forbidden}
    
    response = ecs.register_task_definition(**new_def_args)
    new_rev = response['taskDefinition']['revision']
    
    print(f"\n✅ SUCCESS! Registered revision: {new_rev}")
    
    # 6. Verify first container's env count
    count = len(response['taskDefinition']['containerDefinitions'][0].get('environment', []))
    print(f"🚀 CONFIRMED: {count} variables are live in revision {new_rev}.")

if __name__ == "__main__":
    inject_env()
