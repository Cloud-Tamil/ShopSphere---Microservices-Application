variable "aws_region" {
  type        = string
  description = "The AWS target region for ShopSphere deployment"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Target deployment environment"
  default     = "production"
}

variable "cluster_name" {
  type        = string
  description = "Name of the AWS EKS Cluster"
  default     = "shopsphere-eks-cluster"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the ShopSphere VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability Zones to span across for high availability"
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Public subnets CIDR blocks"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Private subnets CIDR blocks for EKS worker nodes"
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "node_instance_types" {
  type        = list(string)
  description = "EC2 Instance types for managed EKS node group"
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type        = number
  description = "Desired number of worker nodes"
  default     = 3
}

variable "node_min_size" {
  type        = number
  description = "Minimum number of worker nodes"
  default     = 2
}

variable "node_max_size" {
  type        = number
  description = "Maximum number of worker nodes"
  default     = 6
}
