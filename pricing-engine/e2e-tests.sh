TEST_ARGS=$@

export database=pricing-engine
export hostname=localhost
export password=postgres
export username=postgres

docker-compose -f docker-compose.e2e.yml up -d && npx jest --config jest.e2e.config.ts $TEST_ARGS
UP_EXIT_CODE=$?

docker-compose -f docker-compose.e2e.yml down
DOWN_EXIT_CODE=$?

exit $(( UP_EXIT_CODE + DOWN_EXIT_CODE ))
