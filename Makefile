install:
	npm install
build:
	rm -rf dist
	npm run build
start:
	npx babel-node -- 'src/bin/pageLoader.js'
publish:
	npm publish --dry-run
installApp:
	npm link
removeApp:
	npm unlink
lint:
	npx eslint .
test:
	npm run test
test-coverage:
	npm test -- --coverage
watch:
	npm run testWatch