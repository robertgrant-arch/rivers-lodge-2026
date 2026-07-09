.PHONY: help verify-live

help:
	@echo "Available targets:"
	@echo "  make verify-live    Check if current commit is deployed to riverslodgehunt.com"

verify-live:
	@echo "Verifying deployment..."
	@DEPLOYED_COMMIT=$$(curl -s https://riverslodgehunt.com/api/health | jq -r '.commit // empty'); \
	LOCAL_COMMIT=$$(git rev-parse HEAD); \
	if [ -z "$$DEPLOYED_COMMIT" ]; then \
		echo "✗ Unable to fetch deployed commit from /api/health"; \
		exit 1; \
	fi; \
	echo "Deployed: $$DEPLOYED_COMMIT"; \
	echo "Local:    $$LOCAL_COMMIT"; \
	if [ "$$DEPLOYED_COMMIT" = "$$LOCAL_COMMIT" ]; then \
		echo "✓ Deployment verified"; \
		exit 0; \
	else \
		echo "✗ Deployed commit does not match local HEAD"; \
		exit 1; \
	fi
