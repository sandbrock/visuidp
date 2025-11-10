#!/bin/bash

# Transaction Management Audit Script
# This script scans the codebase for potential transaction management issues

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/transaction-audit-report.txt"

echo "==================================================================="
echo "Transaction Management Audit"
echo "==================================================================="
echo ""
echo "Scanning project: $PROJECT_ROOT"
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Clear previous report
> "$REPORT_FILE"

# Function to write to both console and report
log() {
    echo "$1" | tee -a "$REPORT_FILE"
}

log "==================================================================="
log "1. CHECKING FOR WRITE OPERATIONS WITHOUT @Transactional"
log "==================================================================="
log ""

# Find .persist() calls without @Transactional in the same method
log "Searching for .persist() calls..."
grep -rn "\.persist()" "$PROJECT_ROOT/src/main/java" --include="*.java" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    
    # Check if the method containing this line has @Transactional
    # Get 20 lines before the persist call to check for @Transactional
    context=$(sed -n "$((linenum-20)),$((linenum))p" "$file")
    
    if ! echo "$context" | grep -q "@Transactional"; then
        log "⚠️  POTENTIAL ISSUE: $file:$linenum"
        log "   Found .persist() without @Transactional in method"
        log ""
    fi
done

log ""
log "Searching for .delete() calls..."
grep -rn "\.delete()" "$PROJECT_ROOT/src/main/java" --include="*.java" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    
    # Skip if it's a repository.delete() call (those should be in @Transactional methods)
    if echo "$line" | grep -q "repository\.delete"; then
        continue
    fi
    
    # Check if the method containing this line has @Transactional
    context=$(sed -n "$((linenum-20)),$((linenum))p" "$file")
    
    if ! echo "$context" | grep -q "@Transactional"; then
        log "⚠️  POTENTIAL ISSUE: $file:$linenum"
        log "   Found .delete() without @Transactional in method"
        log ""
    fi
done

log ""
log "==================================================================="
log "2. CHECKING FOR @Transactional ON CONTROLLERS"
log "==================================================================="
log ""

find "$PROJECT_ROOT/src/main/java" -path "*/presentation/controllers/*.java" -type f | while read -r file; do
    if grep -q "@Transactional" "$file"; then
        log "❌ ANTI-PATTERN: $file"
        log "   Controller has @Transactional annotation"
        grep -n "@Transactional" "$file" | while read -r match; do
            log "   Line: $match"
        done
        log ""
    fi
done

log ""
log "==================================================================="
log "3. CHECKING FOR @Transactional ON READ-ONLY REPOSITORY METHODS"
log "==================================================================="
log ""

find "$PROJECT_ROOT/src/main/java" -path "*/infrastructure/persistence/postgresql/*.java" -type f | while read -r file; do
    # Check for @Transactional on findById, findAll, count, exists methods
    if grep -A 3 "@Transactional" "$file" | grep -E "(findById|findAll|findBy|count|exists)" | grep -v "save\|delete"; then
        log "⚠️  POTENTIAL ISSUE: $file"
        log "   Repository has @Transactional on read-only method"
        grep -B 1 -A 3 "@Transactional" "$file" | grep -E "(findById|findAll|findBy|count|exists)" | head -5
        log ""
    fi
done

log ""
log "==================================================================="
log "4. CHECKING HEALTH CHECKS FOR @Transactional"
log "==================================================================="
log ""

find "$PROJECT_ROOT/src/main/java" -name "*HealthCheck.java" -type f | while read -r file; do
    log "Checking: $file"
    
    # Check if it implements HealthCheck and performs database operations
    if grep -q "implements HealthCheck" "$file"; then
        has_db_ops=false
        
        # Check for common database operations
        if grep -q "\.count()\|\.findById\|\.findAll\|\.persist\|\.delete" "$file"; then
            has_db_ops=true
        fi
        
        if [ "$has_db_ops" = true ]; then
            if ! grep -q "@Transactional" "$file"; then
                log "⚠️  POTENTIAL ISSUE: $file"
                log "   Health check performs database operations without @Transactional"
                log ""
            else
                log "✅ OK: Has @Transactional"
                log ""
            fi
        else
            log "ℹ️  No database operations detected"
            log ""
        fi
    fi
done

log ""
log "==================================================================="
log "5. CHECKING FOR SCHEDULED JOBS"
log "==================================================================="
log ""

if grep -rn "@Scheduled" "$PROJECT_ROOT/src/main/java" --include="*.java"; then
    log ""
    log "⚠️  Found @Scheduled methods - verify they have proper transaction handling"
    log ""
else
    log "✅ No @Scheduled methods found"
    log ""
fi

log ""
log "==================================================================="
log "6. CHECKING FOR ASYNC OPERATIONS"
log "==================================================================="
log ""

if grep -rn "@Async\|CompletionStage\|Uni<" "$PROJECT_ROOT/src/main/java" --include="*.java"; then
    log ""
    log "⚠️  Found async operations - verify they have proper transaction handling"
    log ""
else
    log "✅ No async operations found"
    log ""
fi

log ""
log "==================================================================="
log "7. REPOSITORY SUMMARY"
log "==================================================================="
log ""

log "PostgreSQL Repositories:"
find "$PROJECT_ROOT/src/main/java" -path "*/infrastructure/persistence/postgresql/*.java" -type f | wc -l | xargs echo "  Total files:"

log ""
log "Methods with @Transactional:"
grep -r "@Transactional" "$PROJECT_ROOT/src/main/java/com/angryss/idp/infrastructure/persistence/postgresql/" --include="*.java" | wc -l | xargs echo "  Count:"

log ""
log "==================================================================="
log "8. SERVICE SUMMARY"
log "==================================================================="
log ""

log "Service Classes:"
find "$PROJECT_ROOT/src/main/java" -path "*/application/usecases/*Service.java" -type f | wc -l | xargs echo "  Total files:"

log ""
log "Methods with @Transactional:"
grep -r "@Transactional" "$PROJECT_ROOT/src/main/java/com/angryss/idp/application/usecases/" --include="*Service.java" | wc -l | xargs echo "  Count:"

log ""
log "==================================================================="
log "AUDIT COMPLETE"
log "==================================================================="
log ""
log "Report saved to: $REPORT_FILE"
log ""
log "Next steps:"
log "1. Review all ⚠️  POTENTIAL ISSUE items"
log "2. Review all ❌ ANTI-PATTERN items"
log "3. Fix identified issues"
log "4. Run integration tests"
log "5. Monitor connection pool metrics"
log ""

echo ""
echo "Would you like to view the full report? (y/n)"
