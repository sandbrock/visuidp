package com.angryss.idp.application.dtos;

import java.util.List;
import java.util.Map;

public class EventConfigurationDto {

    private List<String> eventSources;
    private List<String> eventTypes;
    private Map<String, Object> eventFilters;
    private String deadLetterQueueConfig;
    private Integer maxRetryAttempts;
    private String batchSize;
    private String maximumBatchingWindowInSeconds;

    public EventConfigurationDto() {
    }

    public List<String> getEventSources() {
        return eventSources;
    }

    public void setEventSources(List<String> eventSources) {
        this.eventSources = eventSources;
    }

    public List<String> getEventTypes() {
        return eventTypes;
    }

    public void setEventTypes(List<String> eventTypes) {
        this.eventTypes = eventTypes;
    }

    public Map<String, Object> getEventFilters() {
        return eventFilters;
    }

    public void setEventFilters(Map<String, Object> eventFilters) {
        this.eventFilters = eventFilters;
    }

    public String getDeadLetterQueueConfig() {
        return deadLetterQueueConfig;
    }

    public void setDeadLetterQueueConfig(String deadLetterQueueConfig) {
        this.deadLetterQueueConfig = deadLetterQueueConfig;
    }

    public Integer getMaxRetryAttempts() {
        return maxRetryAttempts;
    }

    public void setMaxRetryAttempts(Integer maxRetryAttempts) {
        this.maxRetryAttempts = maxRetryAttempts;
    }

    public String getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(String batchSize) {
        this.batchSize = batchSize;
    }

    public String getMaximumBatchingWindowInSeconds() {
        return maximumBatchingWindowInSeconds;
    }

    public void setMaximumBatchingWindowInSeconds(String maximumBatchingWindowInSeconds) {
        this.maximumBatchingWindowInSeconds = maximumBatchingWindowInSeconds;
    }
}