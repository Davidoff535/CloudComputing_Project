Compile:
    npm install

Run:
    Set environmental varibles:
        -("JWT_SECRET", "mysecret")
        -("DB_USER", "test_user")
        -("DB_PW", "Vf1BVD9hzn7JuzcQ")
    Example commands for windows powershell:
        -[Environment]::SetEnvironmentVariable("JWT_SECRET", "mysecret")
        -[Environment]::SetEnvironmentVariable("DB_USER", "test_user")
        -[Environment]::SetEnvironmentVariable("DB_PW", "Vf1BVD9hzn7JuzcQ")
    
    npm run start

Use:
    Open http://127.0.0.1:3000/register in browser
    Sign up multiple accounts (for parallel view on 1 device use different browsers)
    Send each other friend request (symbol in top left bar)
    Accept friend request
    Chat with each other